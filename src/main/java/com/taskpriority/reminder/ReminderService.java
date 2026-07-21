package com.taskpriority.reminder;

import com.taskpriority.auth.CurrentUserService;
import com.taskpriority.common.exception.ResourceNotFoundException;
import com.taskpriority.model.Habit;
import com.taskpriority.model.NotificationChannel;
import com.taskpriority.model.NotificationOutboxEntry;
import com.taskpriority.model.NotificationStatus;
import com.taskpriority.model.Reminder;
import com.taskpriority.model.ReminderKind;
import com.taskpriority.model.ReminderStatus;
import com.taskpriority.model.Status;
import com.taskpriority.model.Task;
import com.taskpriority.model.User;
import com.taskpriority.repository.HabitCheckInRepository;
import com.taskpriority.repository.HabitRepository;
import com.taskpriority.repository.NotificationOutboxRepository;
import com.taskpriority.repository.ReminderRepository;
import com.taskpriority.repository.TaskRepository;
import com.taskpriority.repository.UserRepository;
import com.taskpriority.settings.SettingsService;
import com.taskpriority.settings.TimeWindow;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * The reminder pipeline is a two-stage transactional outbox:
 * <ol>
 *   <li>{@link #produceReminders()} scans every user's tasks/habits for things due "today" in
 *       that user's own timezone and creates {@link Reminder} rows (idempotent -- re-running the
 *       scan never creates a duplicate for the same day). Reminders whose time has arrived get a
 *       corresponding {@link NotificationOutboxEntry} (one per reminder+channel, enforced by a
 *       unique constraint so a job re-run can't double-enqueue).</li>
 *   <li>{@link #dispatchNotifications()} delivers pending outbox entries. For the only channel
 *       implemented today (IN_APP) "delivery" just means becoming visible via the notifications
 *       API, so this stage can't actually fail -- the attempts/backoff fields exist for a future
 *       channel (e.g. browser push) that can.</li>
 * </ol>
 * Both jobs run outside any HTTP request, so unlike the rest of the app they iterate every user
 * explicitly rather than going through {@link CurrentUserService}.
 */
@Service
public class ReminderService {
    private static final Logger logger = LoggerFactory.getLogger(ReminderService.class);
    private static final Set<Status> CLOSED_STATUSES = Set.of(Status.DONE, Status.CANCELLED);
    private static final List<ReminderStatus> ACTIVE_REMINDER_STATUSES = List.of(ReminderStatus.PENDING, ReminderStatus.SENT);
    private static final int DEFAULT_REMINDER_HOUR = 9;

    private final ReminderRepository reminderRepository;
    private final NotificationOutboxRepository notificationOutboxRepository;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final HabitRepository habitRepository;
    private final HabitCheckInRepository habitCheckInRepository;
    private final SettingsService settingsService;
    private final CurrentUserService currentUserService;
    private final boolean schedulingEnabled;

    public ReminderService(ReminderRepository reminderRepository, NotificationOutboxRepository notificationOutboxRepository,
                            UserRepository userRepository, TaskRepository taskRepository, HabitRepository habitRepository,
                            HabitCheckInRepository habitCheckInRepository, SettingsService settingsService,
                            CurrentUserService currentUserService,
                            @Value("${app.reminders.scheduling-enabled:true}") boolean schedulingEnabled) {
        this.reminderRepository = reminderRepository;
        this.notificationOutboxRepository = notificationOutboxRepository;
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
        this.habitRepository = habitRepository;
        this.habitCheckInRepository = habitCheckInRepository;
        this.settingsService = settingsService;
        this.currentUserService = currentUserService;
        this.schedulingEnabled = schedulingEnabled;
    }

    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void produceReminders() {
        if (!schedulingEnabled) return;
        for (User user : userRepository.findAll()) {
            try {
                produceRemindersForUser(user.getId());
            } catch (RuntimeException ex) {
                logger.error("Failed to produce reminders for user {}", user.getId(), ex);
            }
        }
        activateDueReminders();
    }

    @Scheduled(fixedDelay = 30_000)
    @Transactional
    public void dispatchNotifications() {
        if (!schedulingEnabled) return;
        for (NotificationOutboxEntry entry : notificationOutboxRepository.findByStatus(NotificationStatus.PENDING)) {
            entry.setAttempts(entry.getAttempts() + 1);
            entry.setStatus(NotificationStatus.SENT);
            notificationOutboxRepository.save(entry);
        }
    }

    private void produceRemindersForUser(Long userId) {
        ZoneId zone = settingsService.getTimezoneForUser(userId);
        TimeWindow quietHours = settingsService.getQuietHoursForUser(userId).orElse(null);
        LocalDate userToday = LocalDate.now(zone);

        for (Task task : taskRepository.findByUserIdAndDueDate(userId, userToday)) {
            if (isActiveTask(task)) {
                createReminderIfAbsent(userId, ReminderKind.TASK_DUE, task.getId(), zone, quietHours, userToday, LocalTime.of(DEFAULT_REMINDER_HOUR, 0));
            }
        }
        for (Task task : taskRepository.findByUserIdAndFollowUpDate(userId, userToday)) {
            if (isActiveTask(task)) {
                createReminderIfAbsent(userId, ReminderKind.FOLLOW_UP, task.getId(), zone, quietHours, userToday, LocalTime.of(DEFAULT_REMINDER_HOUR, 0));
            }
        }

        List<Habit> dueHabits = habitRepository.findByUserId(userId).stream()
                .filter(habit -> !habit.isDeleted() && habit.isReminderEnabled() && habit.getReminderTime() != null)
                .toList();
        if (!dueHabits.isEmpty()) {
            List<Long> habitIds = dueHabits.stream().map(Habit::getId).toList();
            Map<Long, Integer> checkInsToday = habitCheckInRepository.countByHabitIdInAndCheckInDate(userId, habitIds, userToday).stream()
                    .collect(Collectors.toMap(HabitCheckInRepository.HabitCheckInCount::getHabitId, row -> row.getCheckInCount().intValue()));
            for (Habit habit : dueHabits) {
                if (checkInsToday.getOrDefault(habit.getId(), 0) >= habit.getDailyTargetCount()) continue;
                createReminderIfAbsent(userId, ReminderKind.HABIT, habit.getId(), zone, quietHours, userToday, habit.getReminderTime());
            }
        }
    }

    private boolean isActiveTask(Task task) {
        return !task.isDeleted() && !CLOSED_STATUSES.contains(task.getStatus());
    }

    private void createReminderIfAbsent(Long userId, ReminderKind kind, Long referenceId, ZoneId zone, TimeWindow quietHours,
                                         LocalDate userToday, LocalTime candidateLocalTime) {
        LocalDateTime dayStart = toSystemLocalDateTime(LocalDateTime.of(userToday, LocalTime.MIN), zone);
        LocalDateTime dayEnd = toSystemLocalDateTime(LocalDateTime.of(userToday.plusDays(1), LocalTime.MIN), zone);
        boolean exists = reminderRepository.existsByUserIdAndKindAndReferenceIdAndStatusInAndScheduledForBetween(
                userId, kind, referenceId, ACTIVE_REMINDER_STATUSES, dayStart, dayEnd);
        if (exists) return;

        LocalDateTime userLocalDateTime = quietHours != null
                ? deferPastQuietHours(userToday, candidateLocalTime, quietHours)
                : LocalDateTime.of(userToday, candidateLocalTime);

        Reminder reminder = new Reminder();
        reminder.setUserId(userId);
        reminder.setKind(kind);
        reminder.setReferenceId(referenceId);
        reminder.setScheduledFor(toSystemLocalDateTime(userLocalDateTime, zone));
        reminder.setStatus(ReminderStatus.PENDING);
        reminderRepository.save(reminder);
    }

    private void activateDueReminders() {
        LocalDateTime now = LocalDateTime.now();
        for (Reminder reminder : reminderRepository.findByStatusAndScheduledForLessThanEqual(ReminderStatus.PENDING, now)) {
            if (notificationOutboxRepository.existsByReminderIdAndChannel(reminder.getId(), NotificationChannel.IN_APP)) {
                reminder.setStatus(ReminderStatus.SENT);
                reminderRepository.save(reminder);
                continue;
            }
            NotificationContent content = buildContent(reminder);
            if (content == null) {
                reminder.setStatus(ReminderStatus.DISMISSED);
                reminderRepository.save(reminder);
                continue;
            }
            NotificationOutboxEntry entry = new NotificationOutboxEntry();
            entry.setUserId(reminder.getUserId());
            entry.setReminderId(reminder.getId());
            entry.setChannel(NotificationChannel.IN_APP);
            entry.setTitle(content.title());
            entry.setBody(content.body());
            entry.setLink(content.link());
            entry.setStatus(NotificationStatus.PENDING);
            notificationOutboxRepository.save(entry);

            reminder.setStatus(ReminderStatus.SENT);
            reminderRepository.save(reminder);
        }
    }

    private NotificationContent buildContent(Reminder reminder) {
        return switch (reminder.getKind()) {
            case TASK_DUE -> taskRepository.findById(reminder.getReferenceId())
                    .filter(this::isActiveTask)
                    .map(task -> new NotificationContent("Task due today", task.getTitle(), "/tasks/" + task.getId()))
                    .orElse(null);
            case FOLLOW_UP -> taskRepository.findById(reminder.getReferenceId())
                    .filter(this::isActiveTask)
                    .map(task -> new NotificationContent("Follow-up due", task.getTitle(), "/tasks/" + task.getId()))
                    .orElse(null);
            case HABIT -> habitRepository.findById(reminder.getReferenceId())
                    .filter(habit -> !habit.isDeleted())
                    .map(habit -> new NotificationContent("Habit reminder", habit.getTitle(), "/habits"))
                    .orElse(null);
        };
    }

    private boolean isWithinQuietHours(LocalTime time, TimeWindow quietHours) {
        LocalTime start = quietHours.start();
        LocalTime end = quietHours.end();
        if (start.equals(end)) return false;
        if (start.isBefore(end)) {
            return !time.isBefore(start) && time.isBefore(end);
        }
        return !time.isBefore(start) || time.isBefore(end);
    }

    private LocalDateTime deferPastQuietHours(LocalDate localDate, LocalTime candidateTime, TimeWindow quietHours) {
        if (!isWithinQuietHours(candidateTime, quietHours)) {
            return LocalDateTime.of(localDate, candidateTime);
        }
        LocalTime start = quietHours.start();
        LocalTime end = quietHours.end();
        if (start.isBefore(end) || candidateTime.isBefore(start)) {
            return LocalDateTime.of(localDate, end);
        }
        return LocalDateTime.of(localDate.plusDays(1), end);
    }

    private LocalDateTime toSystemLocalDateTime(LocalDateTime userLocalDateTime, ZoneId userZone) {
        return userLocalDateTime.atZone(userZone).withZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime();
    }

    @Transactional(readOnly = true)
    public List<NotificationOutboxEntry> findAll(boolean unreadOnly) {
        Long userId = currentUserService.requireUserId();
        return unreadOnly
                ? notificationOutboxRepository.findByUserIdAndReadFalseOrderByCreatedDateDesc(userId)
                : notificationOutboxRepository.findByUserIdOrderByCreatedDateDesc(userId);
    }

    @Transactional(readOnly = true)
    public long countUnread() {
        return notificationOutboxRepository.countByUserIdAndReadFalse(currentUserService.requireUserId());
    }

    @Transactional
    public NotificationOutboxEntry markRead(Long id) {
        NotificationOutboxEntry entry = findOwned(id);
        entry.setRead(true);
        return notificationOutboxRepository.save(entry);
    }

    @Transactional
    public NotificationOutboxEntry snooze(Long id, LocalDateTime scheduledFor) {
        Long userId = currentUserService.requireUserId();
        NotificationOutboxEntry entry = findOwned(id);
        entry.setRead(true);
        notificationOutboxRepository.save(entry);

        Reminder original = reminderRepository.findById(entry.getReminderId()).orElse(null);
        Reminder snoozed = new Reminder();
        snoozed.setUserId(userId);
        snoozed.setKind(original != null ? original.getKind() : ReminderKind.TASK_DUE);
        snoozed.setReferenceId(original != null ? original.getReferenceId() : null);
        snoozed.setScheduledFor(scheduledFor);
        snoozed.setStatus(ReminderStatus.PENDING);
        reminderRepository.save(snoozed);

        if (original != null) {
            original.setStatus(ReminderStatus.SNOOZED);
            original.setSnoozedUntil(scheduledFor);
            reminderRepository.save(original);
        }
        return entry;
    }

    private NotificationOutboxEntry findOwned(Long id) {
        Long userId = currentUserService.requireUserId();
        return notificationOutboxRepository.findByUserIdAndId(userId, id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification with id " + id + " not found"));
    }

    private record NotificationContent(String title, String body, String link) {}
}
