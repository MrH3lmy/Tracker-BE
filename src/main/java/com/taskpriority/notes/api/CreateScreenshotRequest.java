package com.taskpriority.notes.api;

import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.web.multipart.MultipartFile;

@Schema(description = "Multipart contract for the screenshot tool. Clients capture the screenshot image locally and submit it here so the backend can attach it to a note.")
public class CreateScreenshotRequest {
    @Schema(description = "Screenshot image file. Supported content types: image/png, image/jpeg, image/webp.", requiredMode = Schema.RequiredMode.REQUIRED, type = "string", format = "binary")
    private MultipartFile file;

    @Schema(description = "Optional human-readable caption for the screenshot.", example = "Error state after saving")
    private String caption;

    @Schema(description = "Optional capture source or integration name.", example = "browser-extension")
    private String source;

    @Schema(description = "Optional screenshot width in pixels.", example = "1440")
    private Integer width;

    @Schema(description = "Optional screenshot height in pixels.", example = "900")
    private Integer height;

    public MultipartFile getFile() {
        return file;
    }

    public void setFile(MultipartFile file) {
        this.file = file;
    }

    public String getCaption() {
        return caption;
    }

    public void setCaption(String caption) {
        this.caption = caption;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public Integer getWidth() {
        return width;
    }

    public void setWidth(Integer width) {
        this.width = width;
    }

    public Integer getHeight() {
        return height;
    }

    public void setHeight(Integer height) {
        this.height = height;
    }
}
