package com.taskpriority.notes.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.taskpriority.model.AttachmentStorageProvider;
import com.taskpriority.model.NoteAttachment;
import com.taskpriority.notes.storage.AttachmentStorage;
import com.taskpriority.notes.storage.AttachmentStorageException;
import com.taskpriority.notes.storage.StoredObject;
import com.taskpriority.repository.NoteAttachmentRepository;
import com.taskpriority.repository.NoteRepository;
import com.taskpriority.repository.UserRepository;
import com.taskpriority.support.TestAuthSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.security.MessageDigest;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regression coverage for GitHub issue #261: when an {@link AttachmentStorage} bean is present
 * (app.storage.s3.enabled=true in a real deployment - here injected directly as a mock so the
 * test doesn't need a real MinIO/S3), new screenshot uploads go through it instead of buffering
 * into note_attachments.data.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("local-test")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:notes-object-storage-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
class NoteScreenshotObjectStorageTest {

    @TestConfiguration
    static class ObjectStorageTestConfig {
        @Bean
        AttachmentStorage attachmentStorage() {
            return mock(AttachmentStorage.class);
        }
    }

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private NoteRepository noteRepository;
    @Autowired private NoteAttachmentRepository noteAttachmentRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private AttachmentStorage attachmentStorage;

    @BeforeEach
    void setUp() {
        noteAttachmentRepository.deleteAll();
        noteRepository.deleteAll();
        reset(attachmentStorage);
        TestAuthSupport.loginAsNewUser(userRepository);
    }

    @Test
    void uploadStreamsToObjectStorageInsteadOfBufferingIntoTheDatabaseColumn() throws Exception {
        byte[] content = {1, 2, 3, 4};
        String expectedChecksum = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(content));
        when(attachmentStorage.put(anyString(), any(InputStream.class), eq((long) content.length), eq("image/png")))
                .thenAnswer(invocation -> new StoredObject(invocation.getArgument(0), content.length, expectedChecksum));

        long noteId = createNote("Object storage note");
        MockMultipartFile file = new MockMultipartFile("file", "capture.png", "image/png", content);

        String uploadResponse = mockMvc.perform(multipart("/api/v1/notes/{id}/tools/screenshot", noteId).file(file))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long attachmentId = objectMapper.readTree(uploadResponse).get("id").asLong();

        NoteAttachment saved = noteAttachmentRepository.findById(attachmentId).orElseThrow();
        assertThat(saved.getStorageProvider()).isEqualTo(AttachmentStorageProvider.S3);
        assertThat(saved.getData()).isNull();
        assertThat(saved.getChecksumSha256()).isEqualTo(expectedChecksum);
        assertThat(saved.getStorageKey()).contains("users/").contains("/notes/" + noteId + "/attachments/" + attachmentId + "/");
        verify(attachmentStorage).put(eq(saved.getStorageKey()), any(InputStream.class), eq((long) content.length), eq("image/png"));
    }

    @Test
    void downloadReadsThroughObjectStorage() throws Exception {
        byte[] content = {5, 6, 7};
        when(attachmentStorage.put(anyString(), any(InputStream.class), anyLong(), anyString()))
                .thenAnswer(invocation -> new StoredObject(invocation.getArgument(0), content.length, "irrelevant"));

        long noteId = createNote("Download via object storage");
        MockMultipartFile file = new MockMultipartFile("file", "capture.png", "image/png", content);
        String uploadResponse = mockMvc.perform(multipart("/api/v1/notes/{id}/tools/screenshot", noteId).file(file))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long attachmentId = objectMapper.readTree(uploadResponse).get("id").asLong();
        String storageKey = noteAttachmentRepository.findById(attachmentId).orElseThrow().getStorageKey();

        when(attachmentStorage.get(storageKey)).thenReturn(new ByteArrayInputStream(content));

        mockMvc.perform(get("/api/v1/notes/{id}/screenshots/{attachmentId}", noteId, attachmentId))
                .andExpect(status().isOk())
                .andExpect(result -> assertThat(result.getResponse().getContentAsByteArray()).containsExactly(content));
    }

    @Test
    void deletingTheAttachmentAlsoDeletesTheObjectFromStorage() throws Exception {
        when(attachmentStorage.put(anyString(), any(InputStream.class), anyLong(), anyString()))
                .thenAnswer(invocation -> new StoredObject(invocation.getArgument(0), 1, "irrelevant"));

        long noteId = createNote("Delete via object storage");
        MockMultipartFile file = new MockMultipartFile("file", "capture.png", "image/png", new byte[]{1});
        String uploadResponse = mockMvc.perform(multipart("/api/v1/notes/{id}/tools/screenshot", noteId).file(file))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long attachmentId = objectMapper.readTree(uploadResponse).get("id").asLong();
        String storageKey = noteAttachmentRepository.findById(attachmentId).orElseThrow().getStorageKey();

        mockMvc.perform(delete("/api/v1/notes/{id}/screenshots/{attachmentId}", noteId, attachmentId))
                .andExpect(status().isNoContent());

        verify(attachmentStorage).delete(storageKey);
        assertThat(noteAttachmentRepository.findById(attachmentId)).isEmpty();
    }

    @Test
    void aFailedUploadLeavesNoOrphanAttachmentRow() throws Exception {
        doThrow(new AttachmentStorageException("simulated object storage outage", new RuntimeException()))
                .when(attachmentStorage).put(anyString(), any(InputStream.class), anyLong(), anyString());

        long noteId = createNote("Failed upload note");
        MockMultipartFile file = new MockMultipartFile("file", "capture.png", "image/png", new byte[]{1, 2});

        mockMvc.perform(multipart("/api/v1/notes/{id}/tools/screenshot", noteId).file(file))
                .andExpect(status().isBadRequest());

        assertThat(noteAttachmentRepository.count()).isZero();
    }

    private long createNote(String title) throws Exception {
        ObjectNode payload = objectMapper.createObjectNode().put("title", title).put("body", "body");
        String response = mockMvc.perform(
                        org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/notes")
                                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                                .content(payload.toString()))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asLong();
    }
}
