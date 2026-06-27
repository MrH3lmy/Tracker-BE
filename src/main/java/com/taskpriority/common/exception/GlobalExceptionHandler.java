package com.taskpriority.common.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;

import java.lang.reflect.Method;
import java.time.Instant;
import java.util.stream.Collectors;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private static final String REQUEST_ID_HEADER = "X-Request-Id";

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(this::formatFieldError)
                .collect(Collectors.joining("; "));
        logException(HttpStatus.BAD_REQUEST, request, ex);
        return build(HttpStatus.BAD_REQUEST, message, request.getRequestURI());
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
        logException(HttpStatus.NOT_FOUND, request, ex);
        return build(HttpStatus.NOT_FOUND, ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorResponse> handleBadRequest(IllegalArgumentException ex, HttpServletRequest request) {
        logException(HttpStatus.BAD_REQUEST, request, ex);
        return build(HttpStatus.BAD_REQUEST, ex.getMessage(), request.getRequestURI());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiErrorResponse> handleMaxUploadSizeExceeded(MaxUploadSizeExceededException ex, HttpServletRequest request) {
        logException(HttpStatus.PAYLOAD_TOO_LARGE, request, ex);
        return build(HttpStatus.PAYLOAD_TOO_LARGE, "Uploaded file is too large.", request.getRequestURI());
    }

    @ExceptionHandler(MultipartException.class)
    public ResponseEntity<ApiErrorResponse> handleMultipart(MultipartException ex, HttpServletRequest request) {
        logException(HttpStatus.BAD_REQUEST, request, ex);
        return build(HttpStatus.BAD_REQUEST, "Malformed multipart request.", request.getRequestURI());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleDataIntegrityViolation(DataIntegrityViolationException ex, HttpServletRequest request) {
        logException(HttpStatus.BAD_REQUEST, request, ex);
        return build(HttpStatus.BAD_REQUEST, "Request violates data integrity constraints.", request.getRequestURI());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleException(Exception ex, HttpServletRequest request) {
        logException(HttpStatus.INTERNAL_SERVER_ERROR, request, ex, false);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred.", request.getRequestURI());
    }

    private ResponseEntity<ApiErrorResponse> build(HttpStatus status, String message, String path) {
        return ResponseEntity.status(status).body(new ApiErrorResponse(
                Instant.now(),
                status.value(),
                status.getReasonPhrase(),
                message,
                path
        ));
    }

    private void logException(HttpStatus status, HttpServletRequest request, Exception ex) {
        logException(status, request, ex, true);
    }

    private void logException(HttpStatus status, HttpServletRequest request, Exception ex, boolean handled) {
        String queryString = request.getQueryString();
        String user = resolveAuthenticatedUser();
        logger.error(
                "Exception {} status={} method={} uri={} query={} requestId={} user={}",
                handled ? "handled" : "unhandled",
                status.value(),
                request.getMethod(),
                request.getRequestURI(),
                queryString == null ? "" : queryString,
                request.getHeader(REQUEST_ID_HEADER),
                user,
                ex
        );
    }

    private String resolveAuthenticatedUser() {
        try {
            Class<?> securityContextHolderClass = Class.forName("org.springframework.security.core.context.SecurityContextHolder");
            Method getContext = securityContextHolderClass.getMethod("getContext");
            Object securityContext = getContext.invoke(null);
            Method getAuthentication = securityContext.getClass().getMethod("getAuthentication");
            Object authentication = getAuthentication.invoke(securityContext);
            if (authentication == null) {
                return "anonymous";
            }

            Method isAuthenticated = authentication.getClass().getMethod("isAuthenticated");
            if (!Boolean.TRUE.equals(isAuthenticated.invoke(authentication))) {
                return "anonymous";
            }

            Method getName = authentication.getClass().getMethod("getName");
            Object name = getName.invoke(authentication);
            return name == null || name.toString().isBlank() ? "anonymous" : name.toString();
        } catch (ReflectiveOperationException | RuntimeException ex) {
            return "anonymous";
        }
    }

    private String formatFieldError(FieldError fieldError) {
        return fieldError.getField() + " " + fieldError.getDefaultMessage();
    }
}
