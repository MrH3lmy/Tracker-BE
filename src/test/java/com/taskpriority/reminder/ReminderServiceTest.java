package com.taskpriority.reminder;

import com.taskpriority.auth.CurrentUserService;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class ReminderServiceTest {
    private static final Long USER_ID = 1L;
    private static final ZoneId USER_ZONE = ZoneId.systemDefault();

    private ReminderRepository reminderRepository;
    private NotificationOutboxRepository notificationOutboxRepository;
    private UserRepository userRepository;
    private TaskRepository taskRepository;
    private HabitRepository habitRepository;
    private HabitCheckInRepository habitCheckInRepository;
    private SettingsService settingsService;
    private CurrentUserService currentUserService;
    private SchedulerLeaderLock leaderLock;
    private PlatformTransactionManager transactionManager;
    private ReminderService reminderService;

    private User user(Long id) {
        User user = new User();
        user.setId(id);
        return user;
    }

    private Task task(Long id, Status status, LocalDate dueDate, LocalDate followUpDate) {
        Task task = new Task("Task " + id);
        task.setId(id);
        task.setStatus(status);
        task.setDueDate(dueDate);
        task.setFollowUpDate(followUpDate);
        return task;
    }

    private Habit habit(Long id, boolean reminderEnabled, LocalTime reminderTime, int dailyTargetCount) {
        Habit habit = new Habit("Habit " + id);
        habit.setId(id);
        habit.setReminderEnabled(reminderEnabled);
        habit.setReminderTime(reminderTime);
        habit.setDailyTargetCount(dailyTargetCount);
        return habit;
    }

    private ReminderService buildService(boolean schedulingEnabled) {
        return new ReminderService(reminderRepository, notificationOutboxRepository, userRepository, taskRepository,
                habitRepository, habitCheckInRepository, settingsService, currentUserService, leaderLock, transactionManager,
                schedulingEnabled, 50, 5, 5);
    }

    @BeforeEach
    void setUp() {
        reminderRepository = mock(ReminderRepository.class);
        notificationOutboxRepository = mock(NotificationOutboxRepository.class);
        userRepository = mock(UserRepository.class);
        taskRepository = mock(TaskRepository.class);
        habitRepository = mock(HabitRepository.class);
        habitCheckInRepository = mock(HabitCheckInRepository.class);
        settingsService = mock(SettingsService.class);
        currentUserService = mock(CurrentUserService.class);
        leaderLock = mock(SchedulerLeaderLock.class);
        transactionManager = mock(PlatformTransactionManager.class);
        when(currentUserService.requireUserId()).thenReturn(USER_ID);
        when(leaderLock.tryAcquire(anyLong())).thenReturn(true);
        when(transactionManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        when(userRepository.findAllUserIds()).thenReturn(List.of(USER_ID));
        when(settingsService.getTimezoneForUser(USER_ID)).thenReturn(USER_ZONE);
        when(settingsService.getQuietHoursForUser(USER_ID)).thenReturn(Optional.empty());
        when(taskRepository.findByUserIdAndDueDate(eq(USER_ID), any())).thenReturn(List.of());
        when(taskRepository.findByUserIdAndFollowUpDate(eq(USER_ID), any())).thenReturn(List.of());
        when(habitRepository.findByUserId(USER_ID)).thenReturn(List.of());
        when(reminderRepository.save(any(Reminder.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(notificationOutboxRepository.save(any(NotificationOutboxEntry.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(reminderRepository.findByStatusAndScheduledForLessThanEqual(any(), any())).thenReturn(List.of());
        when(notificationOutboxRepository.claimBatch(any(), anyInt())).thenReturn(List.of());
        when(notificationOutboxRepository.recoverStuckProcessing(any(), any())).thenReturn(0);
        reminderService = buildService(true);
    }

    @Test
    void producesATaskDueReminderForAnActiveTaskDueToday() {
        LocalDate today = LocalDate.now(USER_ZONE);
        when(taskRepository.findByUserIdAndDueDate(USER_ID, today)).thenReturn(List.of(task(5L, Status.NOT_STARTED, today, null)));

        reminderService.produceReminders();

        verify(reminderRepository).save(argThat(reminder ->
                reminder.getKind() == ReminderKind.TASK_DUE && reminder.getReferenceId().equals(5L) && reminder.getUserId().equals(USER_ID)));
    }

    @Test
    void doesNotCreateATaskDueReminderForAClosedTask() {
        LocalDate today = LocalDate.now(USER_ZONE);
        when(taskRepository.findByUserIdAndDueDate(USER_ID, today)).thenReturn(List.of(task(5L, Status.DONE, today, null)));

        reminderService.produceReminders();

        verify(reminderRepository, never()).save(any(Reminder.class));
    }

    @Test
    void doesNotDuplicateAReminderAlreadyCreatedToday() {
        LocalDate today = LocalDate.now(USER_ZONE);
        when(taskRepository.findByUserIdAndDueDate(USER_ID, today)).thenReturn(List.of(task(5L, Status.NOT_STARTED, today, null)));
        when(reminderRepository.existsByUserIdAndKindAndReferenceIdAndStatusInAndScheduledForBetween(
                eq(USER_ID), eq(ReminderKind.TASK_DUE), eq(5L), any(), any(), any())).thenReturn(true);

        reminderService.produceReminders();

        verify(reminderRepository, never()).save(any(Reminder.class));
    }

    @Test
    void producesAFollowUpReminderForATaskFollowUpDueToday() {
        LocalDate today = LocalDate.now(USER_ZONE);
        when(taskRepository.findByUserIdAndFollowUpDate(USER_ID, today)).thenReturn(List.of(task(7L, Status.WAITING, null, today)));

        reminderService.produceReminders();

        verify(reminderRepository).save(argThat(reminder -> reminder.getKind() == ReminderKind.FOLLOW_UP && reminder.getReferenceId().equals(7L)));
    }

    @Test
    void producesAHabitReminderWhenTargetNotYetMetToday() {
        LocalDate today = LocalDate.now(USER_ZONE);
        Habit habit = habit(9L, true, LocalTime.of(8, 0), 1);
        when(habitRepository.findByUserId(USER_ID)).thenReturn(List.of(habit));
        when(habitCheckInRepository.countByHabitIdInAndCheckInDate(eq(USER_ID), eq(List.of(9L)), eq(today))).thenReturn(List.of());

        reminderService.produceReminders();

        verify(reminderRepository).save(argThat(reminder -> reminder.getKind() == ReminderKind.HABIT && reminder.getReferenceId().equals(9L)));
    }

    @Test
    void skipsHabitReminderWhenTargetAlreadyMetToday() {
        LocalDate today = LocalDate.now(USER_ZONE);
        Habit habit = habit(9L, true, LocalTime.of(8, 0), 1);
        when(habitRepository.findByUserId(USER_ID)).thenReturn(List.of(habit));
        HabitCheckInRepository.HabitCheckInCount count = mock(HabitCheckInRepository.HabitCheckInCount.class);
        when(count.getHabitId()).thenReturn(9L);
        when(count.getCheckInCount()).thenReturn(1L);
        when(habitCheckInRepository.countByHabitIdInAndCheckInDate(eq(USER_ID), eq(List.of(9L)), eq(today))).thenReturn(List.of(count));

        reminderService.produceReminders();

        verify(reminderRepository, never()).save(any(Reminder.class));
    }

    @Test
    void deferMeansAReminderDueDuringQuietHoursIsScheduledAfterThem() {
        LocalDate today = LocalDate.now(USER_ZONE);
        when(settingsService.getQuietHoursForUser(USER_ID)).thenReturn(Optional.of(new TimeWindow(LocalTime.of(7, 0), LocalTime.of(10, 0))));
        when(taskRepository.findByUserIdAndDueDate(USER_ID, today)).thenReturn(List.of(task(5L, Status.NOT_STARTED, today, null)));

        reminderService.produceReminders();

        verify(reminderRepository).save(argThat(reminder -> reminder.getScheduledFor().toLocalTime().equals(LocalTime.of(10, 0))));
    }

    @Test
    void producedRemindersCarryADeterministicPerOccurrenceIdempotencyKey() {
        LocalDate today = LocalDate.now(USER_ZONE);
        when(taskRepository.findByUserIdAndDueDate(USER_ID, today)).thenReturn(List.of(task(5L, Status.NOT_STARTED, today, null)));

        reminderService.produceReminders();

        verify(reminderRepository).save(argThat(reminder ->
                reminder.getIdempotencyKey().equals(USER_ID + ":" + ReminderKind.TASK_DUE + ":5:" + today)));
    }

    @Test
    void aDuplicateIdempotencyKeyFromAConcurrentProducerIsSwallowedRatherThanPropagated() {
        LocalDate today = LocalDate.now(USER_ZONE);
        when(taskRepository.findByUserIdAndDueDate(USER_ID, today)).thenReturn(List.of(task(5L, Status.NOT_STARTED, today, null)));
        when(reminderRepository.save(any(Reminder.class)))
                .thenThrow(new org.springframework.dao.DataIntegrityViolationException("duplicate key value violates unique constraint"));

        assertDoesNotThrow(() -> reminderService.produceReminders());
    }

    @Test
    void activatesADueReminderIntoANewOutboxEntry() {
        Reminder dueReminder = new Reminder();
        dueReminder.setId(3L);
        dueReminder.setUserId(USER_ID);
        dueReminder.setKind(ReminderKind.TASK_DUE);
        dueReminder.setReferenceId(5L);
        dueReminder.setStatus(ReminderStatus.PENDING);
        dueReminder.setScheduledFor(LocalDateTime.now().minusMinutes(1));
        when(reminderRepository.findByStatusAndScheduledForLessThanEqual(eq(ReminderStatus.PENDING), any())).thenReturn(List.of(dueReminder));
        when(notificationOutboxRepository.existsByReminderIdAndChannel(3L, NotificationChannel.IN_APP)).thenReturn(false);
        when(taskRepository.findByUserIdAndId(USER_ID, 5L)).thenReturn(Optional.of(task(5L, Status.NOT_STARTED, LocalDate.now(), null)));

        reminderService.produceReminders();

        verify(notificationOutboxRepository).save(argThat(entry -> entry.getReminderId().equals(3L) && entry.getTitle().equals("Task due today")));
        assertEquals(ReminderStatus.SENT, dueReminder.getStatus());
    }

    @Test
    void activatingADeletedTasksReminderDismissesItInsteadOfNotifying() {
        Reminder dueReminder = new Reminder();
        dueReminder.setId(3L);
        dueReminder.setUserId(USER_ID);
        dueReminder.setKind(ReminderKind.TASK_DUE);
        dueReminder.setReferenceId(999L);
        dueReminder.setStatus(ReminderStatus.PENDING);
        dueReminder.setScheduledFor(LocalDateTime.now().minusMinutes(1));
        when(reminderRepository.findByStatusAndScheduledForLessThanEqual(eq(ReminderStatus.PENDING), any())).thenReturn(List.of(dueReminder));
        when(taskRepository.findByUserIdAndId(USER_ID, 999L)).thenReturn(Optional.empty());

        reminderService.produceReminders();

        verify(notificationOutboxRepository, never()).save(any(NotificationOutboxEntry.class));
        assertEquals(ReminderStatus.DISMISSED, dueReminder.getStatus());
    }

    @Test
    void schedulingDisabledSkipsScheduledProducingEntirely() {
        ReminderService disabled = buildService(false);

        disabled.scheduledProduceReminders();

        verify(userRepository, never()).findAllUserIds();
        verify(leaderLock, never()).tryAcquire(anyLong());
    }

    @Test
    void schedulingDisabledSkipsScheduledDispatchingEntirely() {
        ReminderService disabled = buildService(false);

        disabled.scheduledDispatchNotifications();

        verify(notificationOutboxRepository, never()).claimBatch(any(), anyInt());
        verify(leaderLock, never()).tryAcquire(anyLong());
    }

    @Test
    void schedulingDisabledStillAllowsProduceRemindersCalledDirectly() {
        ReminderService disabled = buildService(false);

        disabled.produceReminders();

        verify(userRepository).findAllUserIds();
    }

    @Test
    void schedulingDisabledStillAllowsDispatchNotificationsCalledDirectly() {
        ReminderService disabled = buildService(false);

        disabled.dispatchNotifications();

        verify(notificationOutboxRepository).claimBatch(any(), anyInt());
    }

    @Test
    void producingSkipsEntirelyWhenAnotherInstanceHoldsTheLeaderLock() {
        when(leaderLock.tryAcquire(anyLong())).thenReturn(false);

        reminderService.produceReminders();

        verify(userRepository, never()).findAllUserIds();
    }

    @Test
    void dispatchingNeverConsultsTheLeaderLockSoConcurrentInstancesCanAllDispatch() {
        when(leaderLock.tryAcquire(anyLong())).thenReturn(false);

        reminderService.dispatchNotifications();

        verify(notificationOutboxRepository).claimBatch(any(), anyInt());
        verify(leaderLock, never()).tryAcquire(anyLong());
    }

    @Test
    void dispatchClaimsABatchAndMarksEachEntrySentWithAProcessedTimestamp() {
        NotificationOutboxEntry entry = new NotificationOutboxEntry();
        entry.setId(1L);
        entry.setStatus(NotificationStatus.PROCESSING);
        entry.setAttempts(1);
        when(notificationOutboxRepository.claimBatch(any(), eq(50))).thenReturn(List.of(entry));

        reminderService.dispatchNotifications();

        assertEquals(NotificationStatus.SENT, entry.getStatus());
        assertNotNull(entry.getProcessedAt());
        verify(notificationOutboxRepository).save(entry);
    }

    @Test
    void dispatchRecoversRowsStuckInProcessingBeforeClaimingANewBatch() {
        reminderService.dispatchNotifications();

        verify(notificationOutboxRepository).recoverStuckProcessing(any(), any());
        verify(notificationOutboxRepository).claimBatch(any(), eq(50));
    }

    @Test
    void snoozeCreatesANewPendingReminderAndMarksTheOldOneSnoozed() {
        NotificationOutboxEntry entry = new NotificationOutboxEntry();
        entry.setId(10L);
        entry.setUserId(USER_ID);
        entry.setReminderId(3L);
        when(notificationOutboxRepository.findByUserIdAndId(USER_ID, 10L)).thenReturn(Optional.of(entry));
        Reminder original = new Reminder();
        original.setId(3L);
        original.setUserId(USER_ID);
        original.setKind(ReminderKind.TASK_DUE);
        original.setReferenceId(5L);
        original.setStatus(ReminderStatus.SENT);
        when(reminderRepository.findById(3L)).thenReturn(Optional.of(original));

        LocalDateTime newTime = LocalDateTime.now().plusDays(1);
        reminderService.snooze(10L, newTime);

        assertTrue(entry.isRead());
        assertEquals(ReminderStatus.SNOOZED, original.getStatus());
        verify(reminderRepository).save(argThat(reminder -> reminder.getStatus() == ReminderStatus.PENDING && reminder.getScheduledFor().equals(newTime) && reminder.getReferenceId().equals(5L)));
    }

    @Test
    void markReadSetsTheReadFlag() {
        NotificationOutboxEntry entry = new NotificationOutboxEntry();
        entry.setId(1L);
        entry.setUserId(USER_ID);
        when(notificationOutboxRepository.findByUserIdAndId(USER_ID, 1L)).thenReturn(Optional.of(entry));
        when(notificationOutboxRepository.save(any(NotificationOutboxEntry.class))).thenAnswer(invocation -> invocation.getArgument(0));

        NotificationOutboxEntry result = reminderService.markRead(1L);

        assertTrue(result.isRead());
    }

    @Test
    void findAllDelegatesUnreadOnlyFlagToTheRepository() {
        reminderService.findAll(true);
        verify(notificationOutboxRepository).findByUserIdAndReadFalseOrderByCreatedDateDesc(USER_ID);

        reminderService.findAll(false);
        verify(notificationOutboxRepository).findByUserIdOrderByCreatedDateDesc(USER_ID);
    }
}
