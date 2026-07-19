package com.taskpriority.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            String token = header.substring(BEARER_PREFIX.length());
            // This filter runs on every request, including public endpoints like
            // /api/v1/auth/login, so any exception here must never escape: it would bypass
            // GlobalExceptionHandler and strip the CORS headers the CorsFilter already set,
            // surfacing as a misleading browser CORS error instead of a clean auth failure.
            try {
                Optional<AuthenticatedUser> authenticatedUser = jwtService.parseAccessToken(token);
                if (authenticatedUser.isPresent() && SecurityContextHolder.getContext().getAuthentication() == null) {
                    AuthenticatedUser user = authenticatedUser.get();
                    List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.role().name()));
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(user, null, authorities);
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } catch (RuntimeException ex) {
                // Leave the request unauthenticated; downstream authorization rules handle it.
            }
        }
        filterChain.doFilter(request, response);
    }
}
