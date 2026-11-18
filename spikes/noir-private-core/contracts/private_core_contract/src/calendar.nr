// Calendar helper reused unchanged from spike two; provenance in evidence/noir-evidence/.
// `every: calendar_month`, UTC. month index = year * 12 + month - 1.

/// Month index of a unix timestamp (civil_from_days, H. Hinnant; unsigned, timestamps >= 1970).
pub fn month_index(timestamp: u64) -> u32 {
    let days = timestamp / 86400;
    let z = days + 719468;
    let era = z / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = yoe + era * 400 + (if m <= 2 { 1 } else { 0 });
    (y * 12 + m - 1) as u32
}

/// Unix timestamp of the first second of month `index` (days_from_civil, H. Hinnant).
pub fn month_start(index: u32) -> u64 {
    let y0 = (index / 12) as u64;
    let m = (index % 12) as u64 + 1;
    let y = if m <= 2 { y0 - 1 } else { y0 };
    let era = y / 400;
    let yoe = y - era * 400;
    let mp = if m > 2 { m - 3 } else { m + 9 };
    let doy = (153 * mp + 2) / 5;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    (era * 146097 + doe - 719468) * 86400
}

mod test {
    use super::{month_index, month_start};
    #[test]
    fn months() {
        assert_eq(month_index(1794787200), 2026 * 12 + 10); // 2026-11-16
        assert_eq(month_index(1796083199), 2026 * 12 + 10); // 2026-11-30T23:59:59Z
        assert_eq(month_index(1796083200), 2026 * 12 + 11); // 2026-12-01
        assert_eq(month_index(1835438400), 2028 * 12 + 1); // 2028-02-29T12:00Z
    }
    #[test]
    fn starts() {
        assert_eq(month_start(2026 * 12 + 11), 1796083200); // 2026-12-01
        assert_eq(month_start(2027 * 12), 1798761600); // 2027-01-01
        assert_eq(month_start(2028 * 12 + 2), 1835481600); // 2028-03-01
        for i in 0..40 {
            let idx = 2026 * 12 + i;
            assert_eq(month_index(month_start(idx)), idx);
            assert_eq(month_index(month_start(idx) - 1), idx - 1);
        }
    }
}
