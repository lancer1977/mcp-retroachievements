# RetroAchievements API Wrapper Audit (Api.RetroAchievements)

## Summary

The wrapper is broad and useful, but has a few correctness and hardening issues that can produce broken requests or fragile runtime behavior. It also lacks a first-class game search method used by the existing TS MCP.

## High-priority hardening findings

1. **Broken query composition for `Masters` flag**
   - File: `src/AppendExtensions.cs:161-166`
   - Issue: returns `"{url}t={value}"` (missing `&`) which can generate malformed query strings.
   - Impact: endpoints using `.Masters(...)` may silently call wrong URLs.

2. **Auth state semantic inversion in `DefaultAuthConfig`**
   - File: `src/DefaultAuthConfig.cs:4`
   - Issue: `Authorized => string.IsNullOrEmpty(ApiKey)` evaluates `true` when API key is missing.
   - Impact: can cause incorrect authorization checks in callers.

3. **Unsafe string query concatenation (encoding risk)**
   - Files: `src/AppendExtensions.cs`, `src/RestServiceBase.cs`
   - Issue: query values are appended directly without URL encoding.
   - Impact: usernames/params with special chars can produce invalid or ambiguous requests.
   - Recommendation: move to `UriBuilder` + `HttpUtility.ParseQueryString` or equivalent key/value encoding utility.

4. **Potential infinite/over-fetch loop in recent games pagination**
   - File: `src/Users/RetroArchUserApi.cs:21-29`
   - Issue: loop increments offset until `items.Count >= count`, but doesn’t break when API returns empty/short page.
   - Impact: can spin forever or over-request on sparse histories.

5. **No explicit cancellation support in HTTP path**
   - File: `src/RestServiceBase.cs:51-77`
   - Issue: no `CancellationToken` parameter propagation.
   - Impact: poor resilience under shutdown/backpressure.

## Coverage review: notable endpoint surface in wrapper

The wrapper already includes many endpoints across:
- Achievements (`GetAchievementUnlocks`)
- Games (`GetGame`, `GetGameExtended`, `GetGameHashes`, `GetAchievementCount`, `GetAchievementDistribution`, `GetGameRankAndScore`)
- Users (recent games, summary, profile, progress, awards, claims, points, etc.)
- Systems (`GetConsoleIDs`, `GetGameList`)
- Tickets, Comments, Events, Feeds, Leaderboards

## Coverage gaps relative to MCP needs

1. **Missing strongly-typed game search API method**
   - Existing MCP TS uses `API_GetGameList.php?g={query}`.
   - Current C# wrapper does not expose a game-search method in the game API interface.
   - Workaround in C# MCP: use raw HTTP adapter for this endpoint.
   - Recommendation: add `GetGameList(string query)` (or `SearchGames`) to the wrapper.

2. **Endpoint/method naming consistency drift**
   - Mixed `RetroArch*` / `RetroAchievement*` naming makes discoverability weaker.
   - Recommendation: normalize naming, keep old names with `[Obsolete]` shims.

3. **Nullability contract mismatches**
   - Build emits extensive nullability warnings where interfaces and implementations disagree.
   - Recommendation: align `?` annotations and adopt stricter DTO nullability semantics.

## Suggested next hardening pass

- Fix query builder bugs and centralize URL encoding.
- Add cancellation token overloads for all network methods.
- Add retry policy with jitter for transient 429/5xx responses.
- Add typed error model (HTTP status + endpoint + request id if present).
- Introduce rate-limit aware backoff behavior for bulk calls.
- Add contract tests against known canned RA responses.
