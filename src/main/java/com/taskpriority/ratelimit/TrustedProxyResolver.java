package com.taskpriority.ratelimit;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Resolves the real client address for rate limiting, honoring {@code X-Forwarded-For} only when
 * the direct TCP peer is a configured trusted proxy. This is the "explicit server-controlled
 * mechanism" issue #258 asks for rather than trusting any client-supplied header outright - a
 * direct, untrusted caller cannot spoof its way past a limit by sending its own
 * {@code X-Forwarded-For}, because that header is only consulted once the immediate peer is
 * already known to be one of this deployment's own proxies/load balancers.
 */
@Component
public class TrustedProxyResolver {
    private final List<CidrBlock> trustedProxies;

    public TrustedProxyResolver(@Value("${app.rate-limit.trusted-proxies:}") String trustedProxiesCsv) {
        this.trustedProxies = Arrays.stream(trustedProxiesCsv.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .map(CidrBlock::parse)
                .collect(Collectors.toList());
    }

    public String resolveClientAddress(HttpServletRequest request) {
        String directPeer = request.getRemoteAddr();
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor == null || forwardedFor.isBlank() || !isTrusted(directPeer)) {
            return directPeer;
        }

        // The header can be a comma-separated chain appended to by each hop; the left-most entry
        // is the original client as seen by the first (possibly untrusted) proxy in the chain.
        // Since only the *directly connecting* peer is verified as trusted above, a multi-hop
        // chain beyond that first trusted hop is taken as reported rather than independently
        // verified - deployments with multiple chained proxies should list all of them as trusted.
        String candidate = forwardedFor.split(",")[0].trim();
        return candidate.isEmpty() ? directPeer : candidate;
    }

    private boolean isTrusted(String address) {
        if (trustedProxies.isEmpty() || address == null) {
            return false;
        }
        try {
            InetAddress parsed = InetAddress.getByName(address);
            return trustedProxies.stream().anyMatch(block -> block.contains(parsed));
        } catch (UnknownHostException ex) {
            return false;
        }
    }

    /**
     * Minimal CIDR matcher (IPv4/IPv6) - no external dependency needed for the small, operator-
     * configured trusted-proxy list this compares against.
     */
    private static final class CidrBlock {
        private final byte[] network;
        private final int prefixLength;

        private CidrBlock(byte[] network, int prefixLength) {
            this.network = network;
            this.prefixLength = prefixLength;
        }

        static CidrBlock parse(String cidr) {
            String[] parts = cidr.split("/", 2);
            try {
                byte[] address = InetAddress.getByName(parts[0]).getAddress();
                int maxPrefix = address.length * 8;
                int prefixLength = parts.length == 2 ? Integer.parseInt(parts[1]) : maxPrefix;
                if (prefixLength < 0 || prefixLength > maxPrefix) {
                    throw new IllegalArgumentException("Invalid CIDR prefix length in '" + cidr + "'");
                }
                return new CidrBlock(address, prefixLength);
            } catch (UnknownHostException ex) {
                throw new IllegalArgumentException("Invalid app.rate-limit.trusted-proxies entry: '" + cidr + "'", ex);
            }
        }

        boolean contains(InetAddress candidate) {
            byte[] candidateBytes = candidate.getAddress();
            if (candidateBytes.length != network.length) {
                return false;
            }
            int fullBytes = prefixLength / 8;
            for (int i = 0; i < fullBytes; i++) {
                if (candidateBytes[i] != network[i]) {
                    return false;
                }
            }
            int remainingBits = prefixLength % 8;
            if (remainingBits == 0) {
                return true;
            }
            int mask = 0xFF << (8 - remainingBits);
            return (candidateBytes[fullBytes] & mask) == (network[fullBytes] & mask);
        }
    }
}
