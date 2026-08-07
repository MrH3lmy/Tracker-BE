package com.taskpriority.ratelimit;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.net.InetAddress;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Resolves the real client address for rate limiting. A forwarded chain is consumed from right to
 * left only while the current hop is a configured trusted proxy. This prevents a client-supplied
 * left-most value from redirecting the rate-limit key when a reverse proxy appends to an existing
 * {@code X-Forwarded-For} header.
 */
@Component
public class TrustedProxyResolver {
    private static final int MAX_FORWARDED_FOR_LENGTH = 2_048;
    private static final int MAX_FORWARDED_HOPS = 32;

    private final List<CidrBlock> trustedProxies;

    public TrustedProxyResolver(@Value("${app.rate-limit.trusted-proxies:}") String trustedProxiesCsv) {
        this.trustedProxies = Arrays.stream(trustedProxiesCsv.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .map(CidrBlock::parse)
                .collect(Collectors.toList());
    }

    public String resolveClientAddress(HttpServletRequest request) {
        InetAddress directPeer = parseIpLiteral(request.getRemoteAddr());
        if (directPeer == null) {
            return "unknown";
        }

        String directAddress = directPeer.getHostAddress();
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor == null || forwardedFor.isBlank() || !isTrusted(directPeer)
                || forwardedFor.length() > MAX_FORWARDED_FOR_LENGTH) {
            return directAddress;
        }

        String[] chain = forwardedFor.split(",", -1);
        if (chain.length > MAX_FORWARDED_HOPS) {
            return directAddress;
        }

        InetAddress resolved = directPeer;
        for (int index = chain.length - 1; index >= 0 && isTrusted(resolved); index--) {
            InetAddress previousHop = parseIpLiteral(chain[index]);
            if (previousHop == null) {
                // A malformed value at a hop we would otherwise trust makes the chain unusable.
                // Fall back to the direct peer instead of accepting attacker-controlled text as a
                // distinct rate-limit key.
                return directAddress;
            }
            resolved = previousHop;
        }
        return resolved.getHostAddress();
    }

    private boolean isTrusted(InetAddress address) {
        return !trustedProxies.isEmpty()
                && address != null
                && trustedProxies.stream().anyMatch(block -> block.contains(address));
    }

    private static InetAddress parseIpLiteral(String value) {
        if (value == null) {
            return null;
        }
        String candidate = value.trim();
        if (candidate.isEmpty() || candidate.length() > 45) {
            return null;
        }

        boolean ipv6 = candidate.indexOf(':') >= 0;
        if (ipv6) {
            if (!candidate.matches("[0-9A-Fa-f:.]+")) {
                return null;
            }
        } else {
            String[] octets = candidate.split("\\.", -1);
            if (octets.length != 4) {
                return null;
            }
            for (String octet : octets) {
                if (octet.isEmpty() || octet.length() > 3 || !octet.chars().allMatch(Character::isDigit)) {
                    return null;
                }
                try {
                    if (Integer.parseInt(octet) > 255) {
                        return null;
                    }
                } catch (NumberFormatException ex) {
                    return null;
                }
            }
        }

        try {
            InetAddress parsed = InetAddress.getByName(candidate);
            if (!ipv6 && parsed.getAddress().length != 4) {
                return null;
            }
            return parsed;
        } catch (Exception ex) {
            return null;
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
            InetAddress address = parseIpLiteral(parts[0]);
            if (address == null) {
                throw new IllegalArgumentException("Invalid app.rate-limit.trusted-proxies entry: '" + cidr + "'");
            }

            int maxPrefix = address.getAddress().length * 8;
            final int prefixLength;
            try {
                prefixLength = parts.length == 2 ? Integer.parseInt(parts[1]) : maxPrefix;
            } catch (NumberFormatException ex) {
                throw new IllegalArgumentException("Invalid CIDR prefix length in '" + cidr + "'", ex);
            }
            if (prefixLength < 0 || prefixLength > maxPrefix) {
                throw new IllegalArgumentException("Invalid CIDR prefix length in '" + cidr + "'");
            }
            return new CidrBlock(address.getAddress(), prefixLength);
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
