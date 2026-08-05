package com.taskpriority.ratelimit;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TrustedProxyResolverTest {

    @Test
    void usesDirectPeerWhenNoProxiesAreTrusted() {
        TrustedProxyResolver resolver = new TrustedProxyResolver("");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.5");
        request.addHeader("X-Forwarded-For", "198.51.100.9");

        assertEquals("203.0.113.5", resolver.resolveClientAddress(request));
    }

    @Test
    void usesForwardedForWhenDirectPeerIsATrustedProxy() {
        TrustedProxyResolver resolver = new TrustedProxyResolver("10.0.0.0/8");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.5");
        request.addHeader("X-Forwarded-For", "198.51.100.9");

        assertEquals("198.51.100.9", resolver.resolveClientAddress(request));
    }

    @Test
    void takesTheLeftmostAddressFromAForwardedForChain() {
        TrustedProxyResolver resolver = new TrustedProxyResolver("10.0.0.0/8");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.5");
        request.addHeader("X-Forwarded-For", "198.51.100.9, 10.0.0.5");

        assertEquals("198.51.100.9", resolver.resolveClientAddress(request));
    }

    @Test
    void ignoresForwardedForFromAnUntrustedDirectPeerEvenIfProxiesAreConfigured() {
        TrustedProxyResolver resolver = new TrustedProxyResolver("10.0.0.0/8");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.5");
        request.addHeader("X-Forwarded-For", "198.51.100.9");

        // A spoofed header from a directly-connecting, untrusted client must not redirect the
        // rate-limit key - it must be attributed to the real (untrusted) peer.
        assertEquals("203.0.113.5", resolver.resolveClientAddress(request));
    }

    @Test
    void supportsMultipleTrustedCidrBlocks() {
        TrustedProxyResolver resolver = new TrustedProxyResolver("10.0.0.0/8, 192.168.1.0/24");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("192.168.1.42");
        request.addHeader("X-Forwarded-For", "198.51.100.9");

        assertEquals("198.51.100.9", resolver.resolveClientAddress(request));
    }
}
