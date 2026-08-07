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
    void ignoresASpoofedLeftmostValueWhenTrustedProxyAppendsTheRealClient() {
        TrustedProxyResolver resolver = new TrustedProxyResolver("10.0.0.0/8");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.5");
        request.addHeader("X-Forwarded-For", "198.51.100.200, 203.0.113.9");

        assertEquals("203.0.113.9", resolver.resolveClientAddress(request));
    }

    @Test
    void walksRightToLeftAcrossMultipleTrustedProxyHops() {
        TrustedProxyResolver resolver = new TrustedProxyResolver("10.0.0.0/8,192.168.0.0/16");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.5");
        request.addHeader("X-Forwarded-For", "198.51.100.9, 192.168.1.42");

        assertEquals("198.51.100.9", resolver.resolveClientAddress(request));
    }

    @Test
    void ignoresForwardedForFromAnUntrustedDirectPeerEvenIfProxiesAreConfigured() {
        TrustedProxyResolver resolver = new TrustedProxyResolver("10.0.0.0/8");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.5");
        request.addHeader("X-Forwarded-For", "198.51.100.9");

        assertEquals("203.0.113.5", resolver.resolveClientAddress(request));
    }

    @Test
    void malformedNearestForwardedHopFallsBackToDirectPeer() {
        TrustedProxyResolver resolver = new TrustedProxyResolver("10.0.0.0/8");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.5");
        request.addHeader("X-Forwarded-For", "198.51.100.9, not-an-ip");

        assertEquals("10.0.0.5", resolver.resolveClientAddress(request));
    }

    @Test
    void invalidDirectPeerProducesAStableFallbackKey() {
        TrustedProxyResolver resolver = new TrustedProxyResolver("10.0.0.0/8");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("not-an-ip");

        assertEquals("unknown", resolver.resolveClientAddress(request));
    }
}
