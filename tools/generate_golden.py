"""Generates golden vectors independently of the TypeScript core.

Outputs:
  packages/core/test/golden-vectors/*.json         ETF input + expected results
  packages/core/test/golden-vectors/goals/*.json   savings goal input + expected results
  packages/core/test/golden-vectors/etf-target/*.json  ETF reverse calculator (target value -> rate)
  packages/core/test/golden-vectors/statutory/*.json   statutory pension (Phase 3a)
  packages/core/test/golden-vectors/depot/*.json       retirement depot (Phase 3b)
  packages/core/test/golden-vectors/occupational/*.json  occupational pension (Phase 3c)
  packages/core/test/golden-vectors/overview/*.json    overview of products (Phase 4a-1)
  packages/core/test/golden-vectors/withdrawal/*.json  percent withdrawal of the ETF (review 13 F-16)
  tools/golden-check.xlsx                    one sheet per case with live Excel formulas;
                                             compare the 'Excel' column with the 'Python' column.

All inputs are invented. Run: python3 tools/generate_golden.py
"""
import json
import math
import pathlib

from openpyxl import Workbook

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "packages/core/test/golden-vectors"
TAX = {"capitalGainsTaxRate": 26.375, "partialExemptionRate": 30, "taxFreeAllowance": 1000}
Z = {"pessimistic": 0, "neutral": 0, "optimistic": 0}

# Income tax tariff 2026 (paragraph 32a EStG) and lump sums; own copy of the values (not read from config/).
LUMP_DEDUCTION, SPECIAL_EXPENSES = 102, 36


def income_tax(x):
    """Tariff tax for a yearly taxable income, rounded down to full euros like the law."""
    x = math.floor(x)
    if x <= 12348:
        return 0
    if x <= 17799:
        y = (x - 12348) / 10000
        return math.floor((914.51 * y + 1400) * y)
    if x <= 69878:
        z = (x - 17799) / 10000
        return math.floor((173.1 * z + 2397) * z + 1034.87)
    if x <= 277825:
        return math.floor(0.42 * x - 11135.63)
    return math.floor(0.45 * x - 19470.38)


def taxable_income_yearly(taxable_m, contrib_m):
    """Sum of the taxable monthly pensions (today's purchasing power) to yearly taxable income."""
    t = 12 * taxable_m
    return max(0.0, t - min(LUMP_DEDUCTION, t) - 12 * contrib_m - SPECIAL_EXPENSES)


def pension_tax_monthly(taxable_m, contrib_m):
    """Monthly income tax on the sum of all pensions (today's purchasing power)."""
    return income_tax(taxable_income_yearly(taxable_m, contrib_m)) / 12


def lump_tax(taxable_m, contrib_m, lump):
    """Extra yearly tax of a fully taxable one-off payout on top of the monthly pensions."""
    base = taxable_income_yearly(taxable_m, contrib_m)
    return income_tax(base + lump) - income_tax(base)


def excel_tariff(x):
    """Excel formula text of the tariff for a cell holding the (rounded down) taxable income."""
    y, z = f"(({x}-12348)/10000)", f"(({x}-17799)/10000)"
    return (f"IF({x}<=12348,0,IF({x}<=17799,INT((914.51*{y}+1400)*{y}),IF({x}<=69878,"
            f"INT((173.1*{z}+2397)*{z}+1034.87),IF({x}<=277825,INT(0.42*{x}-11135.63),INT(0.45*{x}-19470.38)))))")

BASE = dict(initialCapital=0, monthlyContribution=100, annualContributionIncreasePercent=0,
            durationYears=10, lumpSums=[], ter=0, entryFeePercent=0, custodyFeeEurPerYear=0,
            custodyFeePercentPerYear=0, returnScenarios={"pessimistic": 3, "neutral": 5, "optimistic": 7},
            inflationPercent=2, taxEnabled=False)

CASES = [
    ("01-constant-no-costs", "Constant rate, no costs, no tax", dict(initialCapital=5000, monthlyContribution=250, durationYears=20)),
    ("02-dynamic-rate", "Rate rises 3% per year", dict(monthlyContribution=300, annualContributionIncreasePercent=3, durationYears=25)),
    ("03-lump-sums", "Two lump sums, one in the last month", dict(monthlyContribution=150, durationYears=8, lumpSums=[{"month": 13, "amount": 2000}, {"month": 96, "amount": 500}])),
    ("04-with-costs", "TER, entry fee, custody fee EUR and percent", dict(initialCapital=10000, monthlyContribution=400, durationYears=15, ter=0.2, entryFeePercent=2, custodyFeeEurPerYear=12, custodyFeePercentPerYear=0.1)),
    ("05-with-tax", "Large gain, tax applies", dict(monthlyContribution=500, durationYears=30, ter=0.2, taxEnabled=True)),
    ("06-gain-below-allowance", "Taxable gain below allowance, tax is zero", dict(monthlyContribution=100, durationYears=2, taxEnabled=True)),
    ("07-one-year", "Duration 1 year", dict(initialCapital=1000, monthlyContribution=200, durationYears=1, taxEnabled=True)),
    ("08-initial-only", "No contributions, only initial capital", dict(initialCapital=20000, monthlyContribution=0, durationYears=12, taxEnabled=True)),
    ("09-max-duration", "60 years, dynamic rate, everything on", dict(initialCapital=2000, monthlyContribution=200, annualContributionIncreasePercent=2, durationYears=60, ter=0.25, entryFeePercent=1, custodyFeeEurPerYear=24, custodyFeePercentPerYear=0.05, taxEnabled=True)),
    ("10-negative-return", "Negative pessimistic return and zero optimistic", dict(initialCapital=3000, monthlyContribution=100, durationYears=10, returnScenarios={"pessimistic": -2, "neutral": 1, "optimistic": 3}, taxEnabled=True)),
]


def project(i, scenario, months=None):
    g = (1 + (i["returnScenarios"][scenario] - i["ter"]) / 100) ** (1 / 12)
    lumps = {}
    for l in i["lumpSums"]:
        lumps[l["month"]] = lumps.get(l["month"], 0) + l["amount"]
    value, paid = i["initialCapital"], i["initialCapital"]
    for m in range(1, (i["durationYears"] * 12 if months is None else months) + 1):
        rate = i["monthlyContribution"] * (1 + i["annualContributionIncreasePercent"] / 100) ** ((m - 1) // 12)
        pay = rate + lumps.get(m, 0)
        paid += pay
        grown = (value + pay * (1 - i["entryFeePercent"] / 100)) * g
        value = max(0.0, grown - i["custodyFeeEurPerYear"] / 12 - grown * i["custodyFeePercentPerYear"] / 1200)
    gain = value - paid
    tax = 0.0
    if i["taxEnabled"] and gain > 0:
        tax = max(0.0, gain * (1 - TAX["partialExemptionRate"] / 100) - TAX["taxFreeAllowance"]) * TAX["capitalGainsTaxRate"] / 100
    after = value - tax
    return dict(grossFinalValue=value, totalContributions=paid, gainBeforeTax=gain, tax=tax,
                finalValueAfterTax=after, finalValueReal=after / (1 + i["inflationPercent"] / 100) ** i["durationYears"])


def excel_sheet(wb, name, i, expected):
    ws = wb.create_sheet(name[:31])
    labels = ["initialCapital", "monthlyContribution", "annualIncrease%", "durationYears", "ter%", "entryFee%",
              "custodyEur/yr", "custody%/yr", "inflation%", "taxEnabled(1/0)"]
    vals = [i["initialCapital"], i["monthlyContribution"], i["annualContributionIncreasePercent"], i["durationYears"],
            i["ter"], i["entryFeePercent"], i["custodyFeeEurPerYear"], i["custodyFeePercentPerYear"],
            i["inflationPercent"], 1 if i["taxEnabled"] else 0]
    for r, (l, v) in enumerate(zip(labels, vals), start=1):
        ws.cell(r, 1, l); ws.cell(r, 2, v)
    ws["D1"], ws["E1"] = "tax rate%", TAX["capitalGainsTaxRate"]
    ws["D2"], ws["E2"] = "partial exemption%", TAX["partialExemptionRate"]
    ws["D3"], ws["E3"] = "allowance EUR", TAX["taxFreeAllowance"]
    # monthly table from row 14; columns: A month, B rate, C lump, D contributed, then per scenario value col
    top = 14
    for c, h in enumerate(["month", "rate", "lump", "contributed", "value pess", "value neutral", "value opt"], start=1):
        ws.cell(top, c, h)
    for s, sc in enumerate(["pessimistic", "neutral", "optimistic"]):
        ws.cell(top - 1, 5 + s, f"gross return % {sc}"); ws.cell(top - 2, 5 + s, i["returnScenarios"][sc])
    lumps = {}
    for l in i["lumpSums"]:
        lumps[l["month"]] = lumps.get(l["month"], 0) + l["amount"]
    ws.cell(top + 1, 1, 0); ws.cell(top + 1, 3, 0); ws.cell(top + 1, 4, "=B1")
    for c in "EFG":
        ws[f"{c}{top + 1}"] = "=$B$1"
    n = i["durationYears"] * 12
    for m in range(1, n + 1):
        r = top + 1 + m
        ws.cell(r, 1, m)
        ws.cell(r, 2, f"=$B$2*(1+$B$3/100)^INT((A{r}-1)/12)")
        ws.cell(r, 3, lumps.get(m, 0))
        ws.cell(r, 4, f"=D{r-1}+B{r}+C{r}")
        for c in "EFG":
            g = f"(1+({c}${top-2}-$B$5)/100)^(1/12)"
            grown = f"({c}{r-1}+(B{r}+C{r})*(1-$B$6/100))*{g}"
            ws[f"{c}{r}"] = f"=MAX(0,{grown}-$B$7/12-({grown})*$B$8/1200)"
    last = top + 1 + n
    # summary: neutral scenario and all three compared with Python values
    ws["I1"], ws["J1"], ws["K1"], ws["L1"] = "metric", "scenario", "Excel", "Python"
    row = 2
    for sc, col in [("pessimistic", "E"), ("neutral", "F"), ("optimistic", "G")]:
        e = expected[sc]
        gross = f"{col}{last}"
        gain = f"({gross}-$D${last})"
        tax = f"IF($B$10=1,MAX(0,{gain}*(1-$E$2/100)-$E$3)*$E$1/100*({gain}>0),0)"
        rows = [("grossFinalValue", f"={gross}", e["grossFinalValue"]),
                ("totalContributions", f"=$D${last}", e["totalContributions"]),
                ("tax", f"={tax}", e["tax"]),
                ("finalValueAfterTax", f"={gross}-{tax}", e["finalValueAfterTax"]),
                ("finalValueReal", f"=({gross}-{tax})/(1+$B$9/100)^$B$4", e["finalValueReal"])]
        for metric, formula, py in rows:
            ws.cell(row, 9, metric); ws.cell(row, 10, sc); ws.cell(row, 11, formula); ws.cell(row, 12, py)
            row += 1


# ---------------------------------------------------------------- savings goals (phase 2)
GOAL_OUT = OUT / "goals"
TARGET_OUT = OUT / "etf-target"
GOAL_TAX = {"capitalGainsTaxRate": 26.375}
HORIZON = 600
MAX_MONTHLY_CENTS = 1_000_000 * 100

GOAL_BASE = dict(id="golden", name="Golden goal", targetAmount=3000, currentAmount=500, monthlyContribution=150,
                 accountInterestPercent=2.5, priority=1, taxEnabled=False, taxFreeAllowancePerYear=1000,
                 startMonth="2026-01")

GOAL_CASES = [
    ("g01-no-tax", "No tax, desired month set", dict(targetAmount=6000, currentAmount=500, monthlyContribution=150, targetMonth="2028-06")),
    ("g02-tax-allowance", "Tax with yearly allowance exceeded, crosses a year change", dict(
        currentAmount=40000, monthlyContribution=500, accountInterestPercent=3, targetAmount=60000, taxEnabled=True,
        taxFreeAllowancePerYear=1000, startMonth="2026-03", targetMonth="2029-03")),
    ("g03-interest-changes", "Two interest changes", dict(
        currentAmount=2000, monthlyContribution=200, accountInterestPercent=2, targetAmount=9000, startMonth="2026-06",
        interestChanges=[{"fromMonth": "2027-01", "percent": 1.5}, {"fromMonth": "2028-07", "percent": 3}],
        targetMonth="2029-06")),
    ("g04-start-december", "Start in December, small allowance resets in January", dict(
        currentAmount=20000, monthlyContribution=300, accountInterestPercent=3.5, targetAmount=30000, taxEnabled=True,
        taxFreeAllowancePerYear=100, startMonth="2026-12", targetMonth="2029-12")),
    ("g05-already-reached", "Current amount is above the target", dict(currentAmount=5000, targetAmount=4000, targetMonth="2026-09")),
    ("g06-not-reached", "No contribution and no interest: not reached within 600 months", dict(
        currentAmount=100, monthlyContribution=0, accountInterestPercent=0, targetAmount=1000)),
    ("g07-required-zero", "Start amount grows to the target by itself: required rate is already_reached", dict(
        currentAmount=900, monthlyContribution=50, accountInterestPercent=5, targetAmount=1000, targetMonth="2030-01")),
    ("g08-required-unreachable", "Target far above what 1,000,000 per month can reach", dict(
        currentAmount=0, monthlyContribution=100, accountInterestPercent=1, targetAmount=10_000_000, targetMonth="2026-03")),
]


# Shared yearly allowance (review 13, F-6): goals in priority order take what earlier goals left per calendar year
GOAL_SHARED_OUT = OUT / "goals-shared"
GOAL_SHARED_CASES = [
    ("gs01-two-goals-same-start", "Two taxed goals, same start, pool 1,000: the first uses it, the second pays more tax", 1000, [
        dict(id="a", priority=1, currentAmount=40000, monthlyContribution=300, accountInterestPercent=3, targetAmount=90000, taxEnabled=True, startMonth="2026-03"),
        dict(id="b", priority=2, currentAmount=30000, monthlyContribution=200, accountInterestPercent=2.5, targetAmount=80000, taxEnabled=True, startMonth="2026-03")]),
    ("gs02-priority-order-and-untaxed", "Three goals listed out of priority order, one untaxed, different starts, pool 1,000", 1000, [
        dict(id="late", priority=3, currentAmount=15000, monthlyContribution=150, accountInterestPercent=3.5, targetAmount=40000, taxEnabled=True, startMonth="2026-11"),
        dict(id="free", priority=2, currentAmount=10000, monthlyContribution=100, accountInterestPercent=2, targetAmount=30000, taxEnabled=False, startMonth="2026-05"),
        dict(id="first", priority=1, currentAmount=25000, monthlyContribution=250, accountInterestPercent=3, targetAmount=60000, taxEnabled=True, startMonth="2026-01")]),
    ("gs03-pool-2000-small-second", "Pool 2,000 (e.g. a couple's allowance); the second goal fits into what is left", 2000, [
        dict(id="a", priority=1, currentAmount=50000, monthlyContribution=400, accountInterestPercent=3, targetAmount=100000, taxEnabled=True, startMonth="2026-02"),
        dict(id="b", priority=2, currentAmount=20000, monthlyContribution=100, accountInterestPercent=2, targetAmount=35000, taxEnabled=True, startMonth="2026-07")]),
]


def month_idx(s):
    return int(s[:4]) * 12 + int(s[5:7]) - 1


def idx_month(i):
    return f"{i // 12:04d}-{i % 12 + 1:02d}"


def sim_goal(g, monthly, max_m, min_m, stop, allowance_for=None, used=None):
    allowance_for = allowance_for or (lambda year: g["taxFreeAllowancePerYear"])
    start = month_idx(g["startMonth"])
    changes = [(month_idx(c["fromMonth"]), c["percent"]) for c in g.get("interestChanges", [])]
    bal = contrib = g["currentAmount"]
    allowance = 0.0
    gross = tax_total = 0.0
    reached = 0 if bal >= g["targetAmount"] - 1e-9 else None
    last = 0
    for m in range(1, max_m + 1):
        if stop and reached is not None and m > min_m:
            break
        idx = start + m
        if m == 1 or idx % 12 == 0:
            allowance = allowance_for(idx // 12)
        pct = g["accountInterestPercent"]
        for frm, p in changes:
            if frm <= idx:
                pct = p
        bal += monthly
        contrib += monthly
        interest = bal * ((1 + pct / 100) ** (1 / 12) - 1)
        month_tax = 0.0
        if g["taxEnabled"]:
            month_tax = max(0.0, interest - allowance) * GOAL_TAX["capitalGainsTaxRate"] / 100
            if used is not None:
                used[idx // 12] = used.get(idx // 12, 0.0) + min(allowance, interest)
            allowance = max(0.0, allowance - interest)
        bal += interest - month_tax
        gross += interest
        tax_total += month_tax
        last = m
        if reached is None and bal >= g["targetAmount"] - 1e-9:
            reached = m
    return dict(balance=bal, gross=gross, tax=tax_total, reached=reached, length=last + 1)


def solve_cents(forward, target):
    reaches = lambda c: forward(c / 100) >= target - 1e-9
    if reaches(0):
        return "already_reached", 0.0
    hi = 100
    while not reaches(hi):
        if hi >= MAX_MONTHLY_CENTS:
            return "unreachable", 0.0
        hi = min(hi * 2, MAX_MONTHLY_CENTS)
    lo = 0
    while hi - lo > 1:
        mid = (lo + hi) // 2
        if reaches(mid):
            hi = mid
        else:
            lo = mid
    return "ok", hi / 100


def project_goal(g, allowance_for=None, used=None):
    start = month_idx(g["startMonth"])
    months_to_target = month_idx(g["targetMonth"]) - start if g.get("targetMonth") else 0
    sim = sim_goal(g, g["monthlyContribution"], HORIZON, months_to_target, True, allowance_for, used)
    status = "not_reached" if sim["reached"] is None else ("reached_at_start" if sim["reached"] == 0 else "reached")
    out = dict(status=status, finalBalance=sim["balance"], interestGross=sim["gross"], tax=sim["tax"],
               interestNet=sim["gross"] - sim["tax"], seriesLength=sim["length"])
    if sim["reached"] is not None:
        out["monthsToReach"] = sim["reached"]
        out["reachedMonth"] = idx_month(start + sim["reached"])
    if g.get("targetMonth"):
        fwd = lambda r: sim_goal(g, r, months_to_target, months_to_target, False, allowance_for)["balance"]
        st, monthly = solve_cents(fwd, g["targetAmount"])
        out["requiredMonthlyForTargetMonth"] = {"status": st, "monthly": monthly}
    return out


def goal_excel_sheet(wb, name, g, expected, monthly, note, pool=None, prev=()):
    """Monthly table with live formulas; compare column K (Excel) with column L (Python)."""
    ws = wb.create_sheet(name[:31])
    start = month_idx(g["startMonth"])
    changes = g.get("interestChanges", [])
    labels = ["startBalance", "monthly", "target", "base interest % p.a.", "taxEnabled(1/0)", "allowance/yr",
              "tax rate %", "start index (year*12+month-1)", "change1 from index", "change1 %",
              "change2 from index", "change2 %"]
    vals = [g["currentAmount"], monthly, g["targetAmount"], g["accountInterestPercent"], 1 if g["taxEnabled"] else 0,
            g["taxFreeAllowancePerYear"], GOAL_TAX["capitalGainsTaxRate"], start,
            month_idx(changes[0]["fromMonth"]) if len(changes) > 0 else 10**9, changes[0]["percent"] if len(changes) > 0 else 0,
            month_idx(changes[1]["fromMonth"]) if len(changes) > 1 else 10**9, changes[1]["percent"] if len(changes) > 1 else 0]
    for r, (l, v) in enumerate(zip(labels, vals), start=1):
        ws.cell(r, 1, l); ws.cell(r, 2, v)
    ws["D1"] = note
    top = 15
    for c, h in enumerate(["month", "calendar idx", "rate %", "contribution", "interest gross", "balance",
                           "allowance before", "tax", "allowance after", "net interest", "reached month"], start=1):
        ws.cell(top, c, h)
    ws.cell(top + 1, 1, 0); ws.cell(top + 1, 2, "=$B$8"); ws.cell(top + 1, 6, "=B1"); ws.cell(top + 1, 9, "=$B$6")
    n = expected["seriesLength"] - 1
    shared = pool is not None
    if shared:
        ws["A2"] = "monthly (B2)"  # keep labels; B6 holds the shared yearly pool in this sheet
        ws["A6"] = "shared allowance pool per year"
        ws.cell(top, 12, "allowance used"); ws.cell(top, 13, "calendar year")

    def cap(r):
        """Allowance of the calendar year of row r: pool minus what the earlier goals used in that year."""
        parts = "".join(f"-SUMIF('{sn}'!$M${top + 2}:$M${sl},INT(B{r}/12),'{sn}'!$L${top + 2}:$L${sl})" for sn, sl in prev)
        return f"MAX(0,$B$6{parts})"
    for m in range(1, n + 1):
        r = top + 1 + m
        ws.cell(r, 1, m)
        ws.cell(r, 2, f"=$B$8+A{r}")
        ws.cell(r, 3, f"=IF(B{r}>=$B$11,$B$12,IF(B{r}>=$B$9,$B$10,$B$4))")
        ws.cell(r, 4, "=$B$2")
        ws.cell(r, 5, f"=(F{r-1}+D{r})*((1+C{r}/100)^(1/12)-1)")
        if shared:
            ws.cell(r, 7, f"=IF(OR(A{r}=1,MOD(B{r},12)=0),{cap(r)},I{r-1})")
            ws.cell(r, 12, f"=IF($B$5=1,MIN(G{r},E{r}),0)")
            ws.cell(r, 13, f"=INT(B{r}/12)")
        else:
            ws.cell(r, 7, f"=IF(MOD(B{r},12)=0,$B$6,I{r-1})")
        ws.cell(r, 8, f"=IF($B$5=1,MAX(0,E{r}-G{r})*$B$7/100,0)")
        ws.cell(r, 9, f"=MAX(0,G{r}-E{r})")
        ws.cell(r, 10, f"=E{r}-H{r}")
        ws.cell(r, 6, f"=F{r-1}+D{r}+J{r}")
        ws.cell(r, 11, f'=IF(F{r}>=$B$3-0.000000001,A{r},"")')
    last = top + 1 + n
    rng = f"K{top + 2}:K{last}"
    ws["M1"], ws["N1"], ws["O1"] = "metric", "Excel", "Python"
    rows = [("monthsToReach (0 = at start, blank = not reached)", f'=IF(B1>=B3-0.000000001,0,IF(COUNT({rng})=0,"not reached",MIN({rng})))',
             expected.get("monthsToReach", "not reached")),
            ("finalBalance (end of table)", f"=F{last}", expected["finalBalance"]),
            ("interestGross", f"=SUM(E{top + 2}:E{last})", expected["interestGross"]),
            ("tax", f"=SUM(H{top + 2}:H{last})", expected["tax"]),
            ("interestNet", f"=SUM(J{top + 2}:J{last})", expected["interestNet"])]
    for k, (metric, formula, py) in enumerate(rows, start=2):
        ws.cell(k, 13, metric); ws.cell(k, 14, formula); ws.cell(k, 15, py)
    return last


def excel_target_sheet(wb, name, i, expected, required, target_nominal):
    """ETF reverse calculator check: neutral required rate as input, Excel final value must be >= target."""
    case = {**i, "monthlyContribution": required}
    exp = {sc: project(case, sc) for sc in ["pessimistic", "neutral", "optimistic"]}
    excel_sheet(wb, name, case, exp)
    ws = wb[name[:31]]
    ws["N1"], ws["O1"] = "target (nominal)", target_nominal
    ws["N2"], ws["O2"] = "neutral rate from Python", required
    ws["N3"] = "Check: finalValueAfterTax neutral (K10) minus target; expect 0 to +0.5 (rate rounded up to the cent)"
    ws["O3"] = f"=K10-O1"


TARGET_CASES = [
    ("t01-nominal", "Nominal target, no tax", dict(initialCapital=5000, monthlyContribution=100, durationYears=20), 200000, "nominal"),
    ("t02-real-tax", "Real target (today's purchasing power), with tax and costs", dict(
        initialCapital=2000, monthlyContribution=100, durationYears=25, ter=0.2, taxEnabled=True), 150000, "real"),
    ("t03-real-dynamic", "Real target with dynamic rate and entry fee", dict(
        monthlyContribution=50, annualContributionIncreasePercent=3, durationYears=30, entryFeePercent=1,
        custodyFeeEurPerYear=12, taxEnabled=True), 300000, "real"),
    ("t04-already-reached", "Initial capital alone reaches the nominal target", dict(
        initialCapital=50000, monthlyContribution=100, durationYears=20), 60000, "nominal"),
]


def solve_etf(i, scenario, target_nominal):
    def forward(m):
        return project({**i, "monthlyContribution": m}, scenario)["finalValueAfterTax"]
    return solve_cents(forward, target_nominal)


# ---- Phase 3a: statutory pension --------------------------------------------------------------
STAT_OUT = OUT / "statutory"
# Own copy of the legal values on purpose (not read from config/); a core test keeps config and fixture in sync.
STAT_LEGAL = dict(
    pension=dict(pensionValue=42.52, averageEarningsYearly=51944, regularRetirementAge=67, regularAgeFromBirthYear=1964, regularAgeBeforeRaise=65, regularAgeRaiseFirstBirthYear=1947,
                 regularAgeRaisePhase1LastBirthYear=1958, regularAgeRaisePhase1MonthsPerYear=1,
                 regularAgeRaisePhase2MonthsPerYear=2,
                 earlyReductionPercentPerMonth=0.3, maxEarlyReductionPercent=14.4,
                 lateIncreasePercentPerMonth=0.5, taxableShareBasePercent=84, taxableShareBaseYear=2026,
                 taxableShareIncreasePerYear=0.5, taxableShareMaxPercent=100),
    social=dict(healthGeneralRatePercent=14.6, healthAdditionalRatePercent=2.9, careRatePercent=3.6,
                careRateChildlessPercent=4.2, contributionCeilingPensionMonthly=8450, referenceIncomeMonthly=3955,
                occupationalHealthAllowanceMonthly=197.75, occupationalCareThresholdMonthly=197.75,
                occupationalSocialInsuranceFreeMonthly=338, occupationalTaxFreeMonthly=676, employerSubsidyPercent=15),
    incomeTax=dict(basicAllowance=12348, zone2Limit=17799, zone3Limit=69878, zone4Limit=277825,
                   zone2CoefficientY=914.51, zone2CoefficientBase=1400, zone3CoefficientZ=173.1,
                   zone3CoefficientBase=2397, zone3Constant=1034.87, zone4RatePercent=42, zone4Constant=11135.63,
                   zone5RatePercent=45, zone5Constant=19470.38, pensionIncomeLumpSumDeductionYearly=102,
                   specialExpensesLumpSumYearly=36),
    unverified=[])
STAT_ASSUMPTIONS = dict(inflationPercent=2, returnScenarios={"pessimistic": 3, "neutral": 5, "optimistic": 7},
                        pensionAdjustmentPercent=2.5, payoutPhaseReturnPercent=2,
                        marginalTaxRateTodayPercent=35, employeeSocialInsuranceRatePercent=20,
                        health=dict(mode="statutoryCompulsory", additionalRatePercent=2.9, childless=False))
STAT_PROFILE = dict(birthYear=1985, targetRetirementAge=67, lifeExpectancyAge=90, childrenBirthYears=[])
STAT_INPUT = dict(projectedMonthlyPensionToday=1800, statementYear=2026, retirementAge=67)

STAT_CASES = [
    ("s01-regular-age", "Retirement at 67, KVdR with children", {}, {}, {}),
    ("s02-early-63", "Retirement at 63: maximum deduction 14.4 %", dict(retirementAge=63), {}, {}),
    ("s03-late-70-childless", "Retirement at 70: supplement 18 %, childless", dict(retirementAge=70), {},
     dict(health=dict(mode="statutoryCompulsory", additionalRatePercent=2.9, childless=True))),
    ("s04-early-65-other", "Retirement at 65, other health insurance with own rate 11 %", dict(retirementAge=65), {},
     dict(health=dict(mode="other", otherRatePercent=11, additionalRatePercent=2.9, childless=False))),
    ("s05-birth-1962", "Birth year 1962, regular age 66 years 8 months entered, retirement at 65", dict(
        projectedMonthlyPensionToday=2100, retirementAge=65, regularRetirementAge=66 + 8 / 12),
     dict(birthYear=1962), dict(pensionAdjustmentPercent=2.0)),
    ("s06-zero-rates", "No adjustment or inflation; retirement 2057", dict(projectedMonthlyPensionToday=1500),
     dict(birthYear=1990), dict(pensionAdjustmentPercent=0, inflationPercent=0)),
    ("s07-share-capped", "Retirement 2062: taxable share capped at 100 %, other insurance 12.5 %", dict(
        projectedMonthlyPensionToday=950), dict(birthYear=1995), dict(
        pensionAdjustmentPercent=3, inflationPercent=2.5,
        health=dict(mode="other", otherRatePercent=12.5, additionalRatePercent=2.9, childless=False))),
    ("s09-amount-for-retirement-age", "Retirement at 63 with the pension for that date entered: no further deduction",
     dict(retirementAge=63, projectedMonthlyPensionAtRetirementAgeToday=1450), {}, {}),
    ("s10-regular-age-from-law", "Birth year 1961: regular age 66 years 6 months from the law, retirement at 65, nothing entered",
     dict(retirementAge=65), dict(birthYear=1961), {}),
    ("s08-statement-year-2024", "Statement from 2024: real values use today's (2026) purchasing power", dict(
        statementYear=2024), {}, {}),
]


# Regular retirement age by birth year (SGB VI 235): (years, months); 1964 and later 67; before 1947 65.
REGULAR_AGE = {1947: (65, 1), 1948: (65, 2), 1949: (65, 3), 1950: (65, 4), 1951: (65, 5), 1952: (65, 6), 1953: (65, 7),
               1954: (65, 8), 1955: (65, 9), 1956: (65, 10), 1957: (65, 11), 1958: (66, 0), 1959: (66, 2),
               1960: (66, 4), 1961: (66, 6), 1962: (66, 8), 1963: (66, 10)}


def regular_age(birth_year):
    if birth_year >= 1964:
        return 67
    y, m = REGULAR_AGE.get(birth_year, (65, 0))
    return y + m / 12


def project_statutory(inp, prof, a, L=STAT_LEGAL, current_year=2026):
    p, soc = L["pension"], L["social"]
    regular = inp.get("regularRetirementAge", regular_age(prof["birthYear"])) if prof["birthYear"] < p["regularAgeFromBirthYear"] else p["regularRetirementAge"]
    months = round((inp["retirementAge"] - regular) * 12)
    if months < 0:
        adj = -min(p["earlyReductionPercentPerMonth"] * -months, p["maxEarlyReductionPercent"])
    else:
        adj = p["lateIncreasePercentPerMonth"] * months
    at_age = inp.get("projectedMonthlyPensionAtRetirementAgeToday", 0)
    if at_age > 0:
        adj = 0  # the amount for the retirement age already contains deduction and entitlement points
    factor = 1 + adj / 100
    ry = prof["birthYear"] + inp["retirementAge"]
    years = ry - inp["statementYear"]
    base = at_age if at_age > 0 else inp["projectedMonthlyPensionToday"]
    gross = base * (1 + a["pensionAdjustmentPercent"] / 100) ** years * factor
    defl = (1 + a["inflationPercent"] / 100) ** (ry - current_year)
    share = min(p["taxableShareMaxPercent"], max(p["taxableShareBasePercent"],
                p["taxableShareBasePercent"] + p["taxableShareIncreasePerYear"] * (ry - p["taxableShareBaseYear"])))
    h = a["health"]
    if h["mode"] == "statutoryCompulsory":
        health = gross * (soc["healthGeneralRatePercent"] / 2 + h["additionalRatePercent"] / 2) / 100
        care = gross * (soc["careRateChildlessPercent"] if h["childless"] else soc["careRatePercent"]) / 100
    else:
        health, care = gross * h["otherRatePercent"] / 100, 0.0
    taxable = gross * share / 100
    tax = pension_tax_monthly(taxable / defl, (health + care) / defl) * defl
    net = gross - tax - health - care
    return dict(retirementYear=ry, yearsToRetirement=years, monthsFromRegularAge=months, adjustmentPercent=adj,
                factor=factor, grossNominal=gross, grossReal=gross / defl, taxableSharePercent=share, tax=tax,
                health=health, care=care, netNominal=net, netReal=net / defl,
                taxableReal=taxable / defl, contributionsReal=(health + care) / defl,
                taxAndContributionsReal=(tax + health + care) / defl)


def stat_excel_sheet(wb, name, inp, prof, a, exp, current_year=2026):
    ws = wb.create_sheet(name[:31])
    L = STAT_LEGAL; p, soc, h = L["pension"], L["social"], a["health"]
    rows = [
        ("pension today (statement)", inp["projectedMonthlyPensionToday"]), ("statement year", inp["statementYear"]),
        ("birth year", prof["birthYear"]), ("retirement age", inp["retirementAge"]),
        ("regular retirement age", inp.get("regularRetirementAge", regular_age(prof["birthYear"]))),
        ("pension adjustment % p.a.", a["pensionAdjustmentPercent"]), ("inflation % p.a.", a["inflationPercent"]),
        ("income tax: tariff 2026, see column G (no input)", None),
        ("health mode (1 = statutory compulsory, 0 = other)", 1 if h["mode"] == "statutoryCompulsory" else 0),
        ("additional health rate %", h["additionalRatePercent"]), ("childless (1/0)", 1 if h["childless"] else 0),
        ("own total rate % (mode other)", h.get("otherRatePercent", 0)),
        ("early reduction % per month", p["earlyReductionPercentPerMonth"]), ("max early reduction %", p["maxEarlyReductionPercent"]),
        ("late increase % per month", p["lateIncreasePercentPerMonth"]), ("taxable share base %", p["taxableShareBasePercent"]),
        ("taxable share base year", p["taxableShareBaseYear"]), ("taxable share increase per year", p["taxableShareIncreasePerYear"]),
        ("taxable share max %", p["taxableShareMaxPercent"]), ("health general rate %", soc["healthGeneralRatePercent"]),
        ("care rate %", soc["careRatePercent"]), ("care rate childless %", soc["careRateChildlessPercent"]),
        ("current year (purchasing power base)", current_year),
        ("pension for this retirement age, today (0 = not entered)", inp.get("projectedMonthlyPensionAtRetirementAgeToday", 0)),
    ]
    ws["A1"], ws["B1"] = "inputs (column B)", None
    for n, (label, value) in enumerate(rows):
        ws.cell(row=n + 2, column=1, value=label); ws.cell(row=n + 2, column=2, value=value)
    # input cells B2..B23 -> pension B2, stmt B3, birth B4, age B5, regular B6, adj B7, infl B8, tax B9, mode B10,
    # addl B11, childless B12, own B13, early B14, maxEarly B15, late B16, shareBase B17, baseYear B18, inc B19,
    # max B20, general B21, care B22, careChildless B23, current year B24
    f = [
        ("retirementYear", "=B4+B5", exp["retirementYear"]),
        ("yearsToRetirement", "=C27-B3", exp["yearsToRetirement"]),
        ("monthsFromRegularAge", "=ROUND((B5-B6)*12,0)", exp["monthsFromRegularAge"]),
        ("adjustmentPercent", "=IF(B25>0,0,IF(C29<0,-MIN(B14*-C29,B15),B16*C29))", exp["adjustmentPercent"]),
        ("factor", "=1+C30/100", exp["factor"]),
        ("grossNominal", "=IF(B25>0,B25,B2)*(1+B7/100)^C28*C31", exp["grossNominal"]),
        ("grossReal", "=C32/(1+B8/100)^(C27-B24)", exp["grossReal"]),
        ("taxableSharePercent", "=MIN(B20,MAX(B17,B17+B19*(C27-B18)))", exp["taxableSharePercent"]),
        ("tax", f"={excel_tariff('G29')}/12*(1+B8/100)^(C27-B24)", exp["tax"]),
        ("health", "=IF(B10=1,C32*(B21+B11)/200,C32*B13/100)", exp["health"]),
        ("care", "=IF(B10=1,C32*IF(B12=1,B23,B22)/100,0)", exp["care"]),
        ("netNominal", "=C32-C35-C36-C37", exp["netNominal"]),
        ("netReal", "=C38/(1+B8/100)^(C27-B24)", exp["netReal"]),
    ]
    ws["A26"], ws["B26"], ws["C26"], ws["D26"], ws["E26"] = "result", "", "Excel", "Python", "difference"
    for n, (label, formula, py) in enumerate(f):
        r = 27 + n
        ws.cell(row=r, column=1, value=label); ws.cell(row=r, column=3, value=formula)
        ws.cell(row=r, column=4, value=py); ws.cell(row=r, column=5, value=f"=C{r}-D{r}")
    ws["F27"], ws["G27"] = "taxable pension per month, today's purchasing power", "=C32*C34/100/(1+B8/100)^(C27-B24)"
    ws["F28"], ws["G28"] = "contributions per month, today's purchasing power", "=(C36+C37)/(1+B8/100)^(C27-B24)"
    ws["F29"], ws["G29"] = "taxable income per year (after 102, contributions, 36)", "=INT(MAX(0,12*G27-MIN(102,12*G27)-12*G28-36))"
    ws.column_dimensions["A"].width = 48


# ---- Phase 3b: retirement depot ---------------------------------------------------------------
DEPOT_OUT = OUT / "depot"
# Own copy of the legal values (not read from config/); a core test keeps config and fixture in sync.
DEPOT_LEGAL = dict(basicGrantTier1Limit=360, basicGrantTier1RatePercent=50, basicGrantTier2Limit=1800,
                   basicGrantTier2RatePercent=25, childGrantRatePercent=100, childGrantContributionLimit=1800,
                   childGrantMaxPerChild=300, childGrantMaxAge=18, youthBonusAmount=200, youthBonusMaxAge=25,
                   minOwnContributionYearly=120, maxContributionYearly=6840, firstContributionYear=2027,
                   payoutStartAgeMin=65, payoutStartAgeMax=70, payoutEndAgeMin=85, lumpSumMaxPercent=30,
                   standardCostCapPercent=1, guaranteeLevelLowPercent=80, guaranteeLevelHighPercent=100)
DEPOT_INPUT = dict(ownContributionMonthly=150, startMonth="2027-01", variant="standard", costPercentPerYear=1.0,
                   payoutStartAge=67, payoutEndAge=85, lumpSumSharePercent=0)
DEPOT_PROFILE = dict(birthYear=1985, targetRetirementAge=67, lifeExpectancyAge=90, childrenBirthYears=[2015, 2018])
ZERO_RATES = dict(inflationPercent=0, payoutPhaseReturnPercent=0,
                  returnScenarios={"pessimistic": 0, "neutral": 0, "optimistic": 0})
OTHER11 = dict(health=dict(mode="other", otherRatePercent=11, additionalRatePercent=2.9, childless=False))

# (name, description, scenario, input overrides, profile overrides, assumption overrides)
DEPOT_CASES = [
    ("d01-base", "150 EUR per month, two children, standard depot, neutral", "neutral", {}, {}, {}),
    ("d02-below-full-grant", "50 EUR per month, no children: basic grant 240 EUR per year", "neutral",
     dict(ownContributionMonthly=50), dict(childrenBirthYears=[]), {}),
    ("d03-below-minimum", "9 EUR per month (108 per year): no grants", "optimistic",
     dict(ownContributionMonthly=9), {}, {}),
    ("d04-guarantee80-floor", "Guarantee 80 %, return override -2 %: floor applies", "pessimistic",
     dict(variant="guarantee80", returnOverridePercent=-2), {}, {}),
    ("d05-guarantee100-no-floor", "Guarantee 100 %, 3 % override: floor below model capital", "neutral",
     dict(variant="guarantee100", returnOverridePercent=3.0, ownContributionMonthly=200), {}, {}),
    ("d06-lump-sum-other-health", "Lump sum 30 %, payout 65 to 90, other health insurance 11 %", "neutral",
     dict(lumpSumSharePercent=30, payoutStartAge=65, payoutEndAge=90), {}, OTHER11),
    ("d07-young-mid-year", "Born 2005, start 2027-07: youth bonus in the first year, payout 70 to 85", "neutral",
     dict(ownContributionMonthly=500, startMonth="2027-07", payoutStartAge=70), dict(birthYear=2005, childrenBirthYears=[]), {}),
    ("d08-zero-rates", "All rates 0: payout plan without interest", "neutral", {}, {}, ZERO_RATES),
    ("d10-rising-contribution", "300 EUR rising 8 % every January: later years hit the 570 EUR monthly maximum", "neutral",
     dict(ownContributionMonthly=300, annualContributionIncreasePercent=8, startMonth="2028-04"),
     dict(birthYear=1990, childrenBirthYears=[2020]), {}),
    ("d09-cost-capped", "Standard depot with 2.0 % costs is capped at 1.0 %", "neutral",
     dict(costPercentPerYear=2.0, ownContributionMonthly=300, startMonth="2028-03"),
     dict(birthYear=1990, childrenBirthYears=[2020]), {}),
]


def depot_grants(A, year, prof, first):
    L = DEPOT_LEGAL
    if A < L["minOwnContributionYearly"]:
        return 0.0, 0.0, 0.0
    basic = min(A, 360) * 0.5 + max(0, min(A, 1800) - 360) * 0.25
    per = min(300, min(A, 1800) * 1.0)
    kids = sum(1 for y in prof["childrenBirthYears"] if 0 <= year - y < 18)
    bonus = 200 if first and year - prof["birthYear"] < 25 else 0
    return basic, per * kids, float(bonus)


def project_depot(inp, prof, a, scenario):
    """Month-by-month loop (the Excel sheet uses closed forms per year)."""
    sy, sm = int(inp["startMonth"][:4]), int(inp["startMonth"][5:])
    start = sy * 12 + sm - 1
    payout_year = prof["birthYear"] + inp["payoutStartAge"]
    months = payout_year * 12 - start
    cost = min(inp["costPercentPerYear"], 1.0) if inp["variant"] == "standard" else inp["costPercentPerYear"]
    guar = inp["variant"] in ("guarantee80", "guarantee100")
    gross = inp["returnOverridePercent"] if guar and "returnOverridePercent" in inp else a["returnScenarios"][scenario]
    g = (1 + (gross - cost) / 100) ** (1 / 12)
    v = own = grants = yc = 0.0
    years = []
    inc = inp.get("annualContributionIncreasePercent", 0)
    for m in range(months):
        idx = start + m
        rate = min(inp["ownContributionMonthly"] * (1 + inc / 100) ** (idx // 12 - sy), 6840 / 12)
        v += rate; own += rate; yc += rate
        v = max(0.0, v * g)
        if idx % 12 == 11:
            y = idx // 12
            b, c, bo = depot_grants(yc, y, prof, y == sy)
            v += b + c + bo; grants += b + c + bo
            years.append(dict(year=y, basic=b, child=c, bonus=bo))
            yc = 0.0
    share = {"guarantee80": 0.8, "guarantee100": 1.0}.get(inp["variant"], 0.0)
    floor = share * (own + grants)
    cap = max(v, floor)
    lump = cap * inp["lumpSumSharePercent"] / 100
    plan = cap - lump
    n = (inp["payoutEndAge"] - inp["payoutStartAge"]) * 12
    i = (1 + a["payoutPhaseReturnPercent"] / 100) ** (1 / 12) - 1
    monthly = plan / n if i == 0 else plan * i / (1 - (1 + i) ** -n)
    defl = (1 + a["inflationPercent"] / 100) ** (payout_year - 2026)
    h = a["health"]
    health_rate = h.get("otherRatePercent", 0) if h["mode"] == "other" else 0
    health = monthly * health_rate / 100
    taxable_real = monthly / defl
    contrib_real = health / defl
    tax = pension_tax_monthly(taxable_real, contrib_real) * defl
    net = monthly - tax - health
    lump_real = lump / defl
    lump_tax_real = lump_tax(taxable_real, contrib_real, lump_real)
    lump_net_real = lump_real - lump_tax_real - lump_real * health_rate / 100
    lump_net = lump_net_real * defl
    return dict(capitalAtPayout=cap, ownTotal=own, allowanceTotal=grants, modelCapital=v, guaranteeFloor=floor,
                lumpSumGross=lump, planCapital=plan, monthlyNominal=monthly, grossReal=monthly / defl, tax=tax,
                health=health, netNominal=net, netReal=net / defl, taxAndContributionsReal=(tax + health) / defl,
                lumpNet=lump_net, lumpNetReal=lump_net_real, allowancesByYear=years)


def depot_excel_sheet(wb, name, inp, prof, a, scenario, exp):
    ws = wb.create_sheet(name[:31])
    L = DEPOT_LEGAL; h = a["health"]
    guar = inp["variant"] in ("guarantee80", "guarantee100")
    gross = inp["returnOverridePercent"] if guar and "returnOverridePercent" in inp else a["returnScenarios"][scenario]
    cost = min(inp["costPercentPerYear"], 1.0) if inp["variant"] == "standard" else inp["costPercentPerYear"]
    kids = (prof["childrenBirthYears"] + [0, 0])[:2]
    assert len(prof["childrenBirthYears"]) <= 2
    rows = [
        ("monthly contribution", inp["ownContributionMonthly"]), ("start year", int(inp["startMonth"][:4])),
        ("start month (1-12)", int(inp["startMonth"][5:])), ("birth year", prof["birthYear"]),
        ("payout start age", inp["payoutStartAge"]), ("payout end age", inp["payoutEndAge"]),
        ("gross return % (scenario or override)", gross), ("cost % used (standard depot capped at 1.0)", cost),
        ("guarantee share %", {"guarantee80": 80, "guarantee100": 100}.get(inp["variant"], 0)),
        ("lump sum %", inp["lumpSumSharePercent"]), ("payout phase return %", a["payoutPhaseReturnPercent"]),
        ("inflation %", a["inflationPercent"]), ("income tax: tariff 2026, see column G (no input)", None),
        ("health rate % (mode other, else 0)", h.get("otherRatePercent", 0) if h["mode"] == "other" else 0),
        ("child 1 birth year (0 = none)", kids[0]), ("child 2 birth year (0 = none)", kids[1]),
        ("current year", 2026),
        ("basic tier 1 limit", L["basicGrantTier1Limit"]), ("basic tier 1 rate %", L["basicGrantTier1RatePercent"]),
        ("basic tier 2 limit", L["basicGrantTier2Limit"]), ("basic tier 2 rate %", L["basicGrantTier2RatePercent"]),
        ("child grant rate %", L["childGrantRatePercent"]), ("child grant contribution limit", L["childGrantContributionLimit"]),
        ("child grant max per child", L["childGrantMaxPerChild"]), ("child grant age limit", L["childGrantMaxAge"]),
        ("youth bonus", L["youthBonusAmount"]), ("youth bonus age limit", L["youthBonusMaxAge"]),
        ("minimum own contribution per year", L["minOwnContributionYearly"]),
        ("annual increase % (every January after the start)", inp.get("annualContributionIncreasePercent", 0)),
    ]
    # B2 rate, B3 start year, B4 start month, B5 birth, B6 payout start, B7 payout end, B8 gross, B9 cost,
    # B10 guarantee %, B11 lump %, B12 payout return, B13 inflation, B14 tax, B15 health, B16 kid1, B17 kid2,
    # B18 current year, B19 tier1 limit, B20 tier1 rate, B21 tier2 limit, B22 tier2 rate, B23 child rate,
    # B24 child limit, B25 child max, B26 child age, B27 bonus, B28 bonus age, B29 minimum
    ws["A1"] = "inputs (column B)"
    for n, (label, value) in enumerate(rows):
        ws.cell(row=n + 2, column=1, value=label); ws.cell(row=n + 2, column=2, value=value)
    ws["A31"], ws["B31"] = "monthly growth g", "=(1+(B8-B9)/100)^(1/12)"
    ws["A32"], ws["B32"] = "payout year", "=B5+B6"
    ws["A33"], ws["B33"] = "months in the first year", "=13-B4"
    hdr = ["year", "months", "own contribution", "basic grant", "child grant", "youth bonus", "grants total",
           "capital year end", "Python: basic", "Python: child", "Python: bonus", "Python: capital check"]
    for c, t in enumerate(hdr):
        ws.cell(row=36, column=c + 1, value=t)
    first = 37
    for k, y in enumerate(exp["allowancesByYear"]):
        r = first + k
        ws.cell(row=r, column=1, value="=B3" if k == 0 else f"=A{r-1}+1")
        ws.cell(row=r, column=2, value="=B33" if k == 0 else 12)
        ws.cell(row=r, column=3, value=f"=B{r}*MIN($B$2*(1+$B$30/100)^(A{r}-$B$3),570)")
        ws.cell(row=r, column=4, value=f"=IF(C{r}<$B$29,0,MIN(C{r},$B$19)*$B$20/100+MAX(0,MIN(C{r},$B$21)-$B$19)*$B$22/100)")
        ws.cell(row=r, column=5, value=f"=IF(C{r}<$B$29,0,MIN($B$25,MIN(C{r},$B$24)*$B$23/100)*((A{r}-$B$16>=0)*(A{r}-$B$16<$B$26)+(A{r}-$B$17>=0)*(A{r}-$B$17<$B$26)))")
        ws.cell(row=r, column=6, value=f"=IF(AND(A{r}=$B$3,C{r}>=$B$29,A{r}-$B$5<$B$28),$B$27,0)")
        ws.cell(row=r, column=7, value=f"=D{r}+E{r}+F{r}")
        prev = "0" if k == 0 else f"H{r-1}"
        ws.cell(row=r, column=8, value=f"=IF($B$31=1,{prev}+C{r},{prev}*$B$31^B{r}+(C{r}/B{r})*$B$31*($B$31^B{r}-1)/($B$31-1))+G{r}")
        ws.cell(row=r, column=9, value=y["basic"]); ws.cell(row=r, column=10, value=y["child"]); ws.cell(row=r, column=11, value=y["bonus"])
    last = first + len(exp["allowancesByYear"]) - 1
    ws.cell(row=last, column=12, value=exp["modelCapital"])
    b = last + 2
    f = [
        ("ownTotal", f"=SUM(C{first}:C{last})", exp["ownTotal"]),
        ("allowanceTotal", f"=SUM(G{first}:G{last})", exp["allowanceTotal"]),
        ("modelCapital", f"=H{last}", exp["modelCapital"]),
        ("guaranteeFloor", f"=B10/100*(C{b}+C{b+1})", exp["guaranteeFloor"]),
        ("capitalAtPayout", f"=MAX(C{b+2},C{b+3})", exp["capitalAtPayout"]),
        ("lumpSumGross", f"=C{b+4}*B11/100", exp["lumpSumGross"]),
        ("planCapital", f"=C{b+4}-C{b+5}", exp["planCapital"]),
        ("monthlyNominal", f"=IF(B12=0,C{b+6}/((B7-B6)*12),C{b+6}*((1+B12/100)^(1/12)-1)/(1-(1+B12/100)^(-(B7-B6))))",
         exp["monthlyNominal"]),
        ("grossReal", f"=C{b+7}/(1+B13/100)^(B32-B18)", exp["grossReal"]),
        ("tax", f"={excel_tariff(f'G{b+9}')}/12*(1+B13/100)^(B32-B18)", exp["tax"]),
        ("health", f"=C{b+7}*B15/100", exp["health"]),
        ("netNominal", f"=C{b+7}-C{b+9}-C{b+10}", exp["netNominal"]),
        ("netReal", f"=C{b+11}/(1+B13/100)^(B32-B18)", exp["netReal"]),
        ("lumpNet", f"=(C{b+5}/(1+B13/100)^(B32-B18)-G{b+10}-C{b+5}/(1+B13/100)^(B32-B18)*B15/100)*(1+B13/100)^(B32-B18)", exp["lumpNet"]),
    ]
    ws.cell(row=b - 1, column=1, value="result"); ws.cell(row=b - 1, column=3, value="Excel")
    ws.cell(row=b - 1, column=4, value="Python"); ws.cell(row=b - 1, column=5, value="difference")
    for n, (label, formula, py) in enumerate(f):
        r = b + n
        ws.cell(row=r, column=1, value=label); ws.cell(row=r, column=3, value=formula)
        ws.cell(row=r, column=4, value=py); ws.cell(row=r, column=5, value=f"=C{r}-D{r}")
    # Column G: taxable pension per month (today), taxable income per year, extra tax on the lump sum (today).
    ws.cell(row=b + 8, column=6, value="taxable pension per month, today's purchasing power")
    ws.cell(row=b + 8, column=7, value=f"=C{b+8}")
    ws.cell(row=b + 9, column=6, value="taxable income per year (after 102, contributions, 36)")
    ws.cell(row=b + 9, column=7, value=f"=INT(MAX(0,12*G{b+8}-MIN(102,12*G{b+8})-12*C{b+10}/(1+B13/100)^(B32-B18)-36))")
    ws.cell(row=b + 10, column=6, value="extra tax on the lump sum, today's purchasing power")
    lump_real = f"(C{b+5}/(1+B13/100)^(B32-B18))"
    ws.cell(row=b + 10, column=7, value=(
        f"=({excel_tariff(f'INT(G{b+9}+{lump_real})')})-({excel_tariff(f'G{b+9}')})"))
    ws.column_dimensions["A"].width = 48


# ---- Phase 3c: occupational pension -----------------------------------------------------------
BAV_OUT = OUT / "occupational"
BAV_INPUT = dict(employeeContributionMonthlyGross=200, employerSubsidyMode="auto15", employerContributionMonthly=0,
                 costPercentPerYear=1.0, startMonth="2027-01", payoutStartAge=67, payoutEndAge=85)
BAV_PROFILE = dict(birthYear=1985, targetRetirementAge=67, lifeExpectancyAge=90, childrenBirthYears=[])

# (name, description, scenario, input overrides, profile overrides, assumption overrides)
BAV_CASES = [
    ("b01-base", "200 EUR conversion, automatic 15 % subsidy, neutral, KVdR", "neutral", {}, {}, {}),
    ("b02-conversion-above-338", "400 EUR conversion: subsidy capped at 338 EUR base, SV saving capped", "neutral",
     dict(employeeContributionMonthlyGross=400), {}, {}),
    ("b03-below-care-threshold", "100 EUR conversion: real pension under 197.75 EUR, no health or care", "neutral",
     dict(employeeContributionMonthlyGross=100), {}, {}),
    ("b04-guarantee-floor", "Pessimistic -2 %, guaranteed 2 % after costs: floor applies", "pessimistic",
     dict(guaranteedRatePercent=2.0), {},
     dict(returnScenarios={"pessimistic": -2, "neutral": 1, "optimistic": 3})),
    ("b05-custom-subsidy-other-health", "Custom subsidy 25, employer extra 20, other health 11 %, payout 65 to 90",
     "neutral", dict(employerSubsidyMode="custom", employerSubsidyCustomMonthly=25, employerContributionMonthly=20,
                     payoutStartAge=65, payoutEndAge=90), {}, OTHER11),
    ("b06-childless-mid-year", "Born 1990, start 2030-07, childless, payout 63 to 88, optimistic", "optimistic",
     dict(startMonth="2030-07", employeeContributionMonthlyGross=338, payoutStartAge=63, payoutEndAge=88,
          costPercentPerYear=0.6), dict(birthYear=1990),
     dict(health=dict(mode="statutoryCompulsory", additionalRatePercent=2.9, childless=True))),
    ("b08-rising-conversion", "200 EUR conversion rising 10 % every January, capped at the tax-free limit 676 EUR", "neutral",
     dict(annualContributionIncreasePercent=10, startMonth="2027-07", payoutStartAge=67, payoutEndAge=90),
     dict(birthYear=1975), {}),
    ("b07-zero-rates", "All rates 0: payout plan without interest", "neutral", {}, {}, ZERO_RATES),
]


def bav_effort(conv, a):
    L = STAT_LEGAL["social"]
    tax_s = min(conv, L["occupationalTaxFreeMonthly"]) * a["marginalTaxRateTodayPercent"] / 100
    soc_s = min(conv, L["occupationalSocialInsuranceFreeMonthly"]) * a["employeeSocialInsuranceRatePercent"] / 100
    return tax_s, soc_s, conv - tax_s - soc_s


def project_bav(inp, prof, a, scenario):
    L = STAT_LEGAL["social"]
    sy, sm = int(inp["startMonth"][:4]), int(inp["startMonth"][5:])
    start = sy * 12 + sm - 1
    payout_year = prof["birthYear"] + inp["payoutStartAge"]
    months = payout_year * 12 - start
    conv = inp["employeeContributionMonthlyGross"]
    if inp["employerSubsidyMode"] == "custom":
        subsidy = inp.get("employerSubsidyCustomMonthly", 0)
    else:
        subsidy = L["employerSubsidyPercent"] / 100 * min(conv, L["occupationalSocialInsuranceFreeMonthly"])
    rate = conv + subsidy + inp["employerContributionMonthly"]
    inc = inp.get("annualContributionIncreasePercent", 0)
    model_net = a["returnScenarios"][scenario] - inp["costPercentPerYear"]
    net_ret = max(model_net, inp["guaranteedRatePercent"]) if "guaranteedRatePercent" in inp else model_net
    g = (1 + net_ret / 100) ** (1 / 12)
    v = 0.0
    contributed = points_base = 0.0
    for m in range(months):
        k = (start + m) // 12 - sy
        conv_m = min(conv * (1 + inc / 100) ** k, L["occupationalTaxFreeMonthly"])
        if inp["employerSubsidyMode"] == "custom":
            sub_m = inp.get("employerSubsidyCustomMonthly", 0)
        else:
            sub_m = L["employerSubsidyPercent"] / 100 * min(conv_m, L["occupationalSocialInsuranceFreeMonthly"])
        rate_m = conv_m + sub_m + inp["employerContributionMonthly"]
        v = max(0.0, (v + rate_m) * g)
        contributed += rate_m
        points_base += min(conv_m, L["occupationalSocialInsuranceFreeMonthly"])
    n = (inp["payoutEndAge"] - inp["payoutStartAge"]) * 12
    i = (1 + a["payoutPhaseReturnPercent"] / 100) ** (1 / 12) - 1
    monthly = v / n if i == 0 else v * i / (1 - (1 + i) ** -n)
    defl = (1 + a["inflationPercent"] / 100) ** (payout_year - 2026)
    h = a["health"]
    if h["mode"] == "other":
        health = monthly * h.get("otherRatePercent", 0) / 100; care = 0.0
    else:
        allow = L["occupationalHealthAllowanceMonthly"] * defl
        thr = L["occupationalCareThresholdMonthly"] * defl
        health = max(0.0, monthly - allow) * (L["healthGeneralRatePercent"] + h["additionalRatePercent"]) / 100
        care = monthly * (L["careRateChildlessPercent"] if h["childless"] else L["careRatePercent"]) / 100 if monthly > thr else 0.0
    tax = pension_tax_monthly(monthly / defl, (health + care) / defl) * defl
    net = monthly - tax - health - care
    tax_s, soc_s, eff = bav_effort(conv, a)
    loss = points_base * STAT_LEGAL["pension"]["pensionValue"] / STAT_LEGAL["pension"]["averageEarningsYearly"]
    return dict(statutoryLossMonthlyToday=loss, subsidyMonthly=subsidy, intoContractMonthly=rate, taxSaving=tax_s, socialSaving=soc_s, netEffort=eff,
                capitalAtPayout=v, contributedTotal=contributed, monthlyNominal=monthly, grossReal=monthly / defl,
                tax=tax, health=health, care=care, netNominal=net, netReal=net / defl,
                taxAndContributionsReal=(tax + health + care) / defl)


BAV_T0 = 62  # first row of the yearly table in the occupational sheets


def bav_excel_sheet(wb, name, inp, prof, a, scenario, exp):
    ws = wb.create_sheet(name[:31])
    years = prof["birthYear"] + inp["payoutStartAge"] - int(inp["startMonth"][:4])
    L = STAT_LEGAL["social"]; h = a["health"]
    custom = inp["employerSubsidyMode"] == "custom"
    rows = [
        ("conversion per month", inp["employeeContributionMonthlyGross"]),
        ("custom subsidy per month (0 if auto)", inp.get("employerSubsidyCustomMonthly", 0) if custom else 0),
        ("auto subsidy 1 / custom 0", 0 if custom else 1),
        ("employer extra per month", inp["employerContributionMonthly"]),
        ("start year", int(inp["startMonth"][:4])), ("start month (1-12)", int(inp["startMonth"][5:])),
        ("birth year", prof["birthYear"]), ("payout start age", inp["payoutStartAge"]),
        ("payout end age", inp["payoutEndAge"]),
        ("gross return % (scenario)", a["returnScenarios"][scenario]), ("cost %", inp["costPercentPerYear"]),
        ("guaranteed rate % (-1000 = none)", inp.get("guaranteedRatePercent", -1000)),
        ("payout phase return %", a["payoutPhaseReturnPercent"]), ("inflation %", a["inflationPercent"]),
        ("income tax: tariff 2026, see column G (no input)", None),
        ("KVdR 1 / other 0", 1 if h["mode"] == "statutoryCompulsory" else 0),
        ("other health rate %", h.get("otherRatePercent", 0)), ("additional health rate %", h["additionalRatePercent"]),
        ("childless 1 / 0", 1 if h["childless"] else 0), ("current year", 2026),
        ("marginal tax rate today %", a["marginalTaxRateTodayPercent"]),
        ("employee social insurance rate %", a["employeeSocialInsuranceRatePercent"]),
        ("employer subsidy %", L["employerSubsidyPercent"]), ("SV-free limit", L["occupationalSocialInsuranceFreeMonthly"]),
        ("tax-free limit", L["occupationalTaxFreeMonthly"]), ("general health rate %", L["healthGeneralRatePercent"]),
        ("care rate %", L["careRatePercent"]), ("care rate childless %", L["careRateChildlessPercent"]),
        ("health allowance (today)", L["occupationalHealthAllowanceMonthly"]),
        ("care threshold (today)", L["occupationalCareThresholdMonthly"]),
    ]
    # B2 conv, B3 custom subsidy, B4 auto flag, B5 extra, B6 start year, B7 start month, B8 birth, B9 payout start,
    # B10 payout end, B11 gross, B12 cost, B13 guarantee, B14 payout return, B15 inflation, B16 tax, B17 KVdR,
    # B18 other rate, B19 additional, B20 childless, B21 current year, B22 marginal, B23 employee SV,
    # B24 subsidy %, B25 SV limit, B26 tax-free limit, B27 general, B28 care, B29 care childless, B30 allowance, B31 threshold
    ws["A1"] = "inputs (column B)"
    for n, (label, value) in enumerate(rows):
        ws.cell(row=n + 2, column=1, value=label); ws.cell(row=n + 2, column=2, value=value)
    ws["A34"], ws["B34"] = "net return used %", "=IF(B13=-1000,B11-B12,MAX(B11-B12,B13))"
    ws["A35"], ws["B35"] = "monthly growth g", "=(1+B34/100)^(1/12)"
    ws["A36"], ws["B36"] = "payout year", "=B8+B9"
    ws["A37"], ws["B37"] = "months of savings", "=B36*12-(B6*12+B7-1)"
    ws["A38"], ws["B38"] = "inflation factor", "=(1+B15/100)^(B36-B21)"
    ws["A39"], ws["B39"] = "annual increase of the conversion % (every January)", inp.get("annualContributionIncreasePercent", 0)
    f = [
        ("subsidyMonthly", "=IF(B4=1,B24/100*MIN(B2,B25),B3)", exp["subsidyMonthly"]),
        ("intoContractMonthly", "=B2+C41+B5", exp["intoContractMonthly"]),
        ("taxSaving", "=MIN(B2,B26)*B22/100", exp["taxSaving"]),
        ("socialSaving", "=MIN(B2,B25)*B23/100", exp["socialSaving"]),
        ("netEffort", "=B2-C43-C44", exp["netEffort"]),
        ("capitalAtPayout", f"=H{BAV_T0 + years - 1}", exp["capitalAtPayout"]),
        ("contributedTotal", f"=SUM(F{BAV_T0}:F{BAV_T0 + years - 1})", exp["contributedTotal"]),
        ("monthlyNominal", "=IF(B14=0,C46/((B10-B9)*12),C46*((1+B14/100)^(1/12)-1)/(1-(1+B14/100)^(-(B10-B9))))", exp["monthlyNominal"]),
        ("grossReal", "=C48/B38", exp["grossReal"]),
        ("tax", f"={excel_tariff('G49')}/12*B38", exp["tax"]),
        ("health", "=IF(B17=1,MAX(0,C48-B30*B38)*(B27+B19)/100,C48*B18/100)", exp["health"]),
        ("care", "=IF(AND(B17=1,C48>B31*B38),C48*IF(B20=1,B29,B28)/100,0)", exp["care"]),
        ("netNominal", "=C48-C50-C51-C52", exp["netNominal"]),
        ("netReal", "=C53/B38", exp["netReal"]),
        ("statutoryLossMonthlyToday", f"=SUM(G{BAV_T0}:G{BAV_T0 + years - 1})*B33/B32", exp["statutoryLossMonthlyToday"]),
    ]
    ws["A32"], ws["B32"] = "average earnings per year", STAT_LEGAL["pension"]["averageEarningsYearly"]
    ws["A33"], ws["B33"] = "pension value per entitlement point", STAT_LEGAL["pension"]["pensionValue"]
    ws.cell(row=40, column=1, value="result"); ws.cell(row=40, column=3, value="Excel")
    ws.cell(row=40, column=4, value="Python"); ws.cell(row=40, column=5, value="difference")
    for n, (label, formula, py) in enumerate(f):
        r = 41 + n
        ws.cell(row=r, column=1, value=label); ws.cell(row=r, column=3, value=formula)
        ws.cell(row=r, column=4, value=py); ws.cell(row=r, column=5, value=f"=C{r}-D{r}")
    hdr = ["year", "months", "conversion", "subsidy", "into contract", "contributed", "SV-free part x months", "capital year end"]
    for c, t in enumerate(hdr, start=1):
        ws.cell(row=BAV_T0 - 1, column=c, value=t)
    for k in range(years):
        r = BAV_T0 + k
        prev = "0" if k == 0 else f"H{r-1}"
        ws.cell(row=r, column=1, value="=B6" if k == 0 else f"=A{r-1}+1")
        ws.cell(row=r, column=2, value="=13-B7" if k == 0 else 12)
        ws.cell(row=r, column=3, value=f"=MIN($B$2*(1+$B$39/100)^(A{r}-$B$6),$B$26)")
        ws.cell(row=r, column=4, value=f"=IF($B$4=1,$B$24/100*MIN(C{r},$B$25),$B$3)")
        ws.cell(row=r, column=5, value=f"=C{r}+D{r}+$B$5")
        ws.cell(row=r, column=6, value=f"=E{r}*B{r}")
        ws.cell(row=r, column=7, value=f"=MIN(C{r},$B$25)*B{r}")
        ws.cell(row=r, column=8, value=f"=IF($B$35=1,{prev}+E{r}*B{r},{prev}*$B$35^B{r}+E{r}*$B$35*($B$35^B{r}-1)/($B$35-1))")
    ws["F48"], ws["G48"] = "taxable pension per month, today's purchasing power", "=C48/B38"
    ws["F49"], ws["G49"] = "taxable income per year (after 102, contributions, 36)", "=INT(MAX(0,12*G48-MIN(102,12*G48)-12*(C51+C52)/B38-36))"
    ws.column_dimensions["A"].width = 40


# ---- Phase 4a-1: overview ------------------------------------------------------------------------
OV_OUT = OUT / "overview"
SCEN = ["pessimistic", "neutral", "optimistic"]
OV_FACTOR = {"pessimistic": 0.8, "neutral": 1.0, "optimistic": 1.25}
OV_PROFILE = dict(birthYear=1985, targetRetirementAge=67, lifeExpectancyAge=90, childrenBirthYears=[])


def ov_product(kind, start, gross, taxable, contrib, fixed=0.0, end=None, enabled=True, valid=True, lump=None):
    """Projection results are invented inputs of the overview, not outputs of other projectors.
    All amounts are per month in today's purchasing power; `fixed` is tax that does not depend on other income (ETF)."""
    p = dict(productId=kind, enabled=enabled, payoutStartAge=start)
    if end is not None:
        p["payoutEndAge"] = end
    if not valid:
        p["valid"] = False
        return p
    p["valid"] = True
    p["results"] = {}
    for sc in SCEN:
        f = 1.0 if kind == "statutory" else OV_FACTOR[sc]
        r = dict(monthlyPensionReal=gross * f, taxableMonthlyReal=taxable * f, contributionsMonthlyReal=contrib * f,
                 fixedTaxMonthlyReal=fixed * f)
        if lump:
            r["lumpSum"] = dict(grossReal=lump * f)
        p["results"][sc] = r
    return p


OV_ASSUMPTIONS = dict(inflationPercent=2, pensionAdjustmentPercent=2.5)
OV_CASES = [
    ("o01-three-products", "Statutory, depot (ends 85) and company pension (ends 80), gap against 2,800", {},
     OV_ASSUMPTIONS, [ov_product("statutory", 67, 2100, 1785, 260),
                      ov_product("retirementDepot", 67, 480, 480, 0, end=85, lump=12000),
                      ov_product("occupational", 67, 330, 330, 45, end=80)], 2800),
    ("o02-surplus", "Desired income below the pension: gap 0, surplus", {}, OV_ASSUMPTIONS,
     [ov_product("statutory", 67, 2500, 2125, 310), ov_product("etf", 67, 600, 0, 0, fixed=100, end=90)], 1500),
    ("o03-disabled-and-invalid", "One product disabled, one invalid: neither counts", {}, OV_ASSUMPTIONS,
     [ov_product("statutory", 67, 1950, 1660, 240),
      ov_product("retirementDepot", 67, 360, 360, 0, end=85, enabled=False),
      ov_product("occupational", 67, 0, 0, 0, end=85, valid=False)], 2200),
    ("o04-depot-starts-later", "Depot pays from 70, the snapshot at 67 carries it with 0", {}, OV_ASSUMPTIONS,
     [ov_product("statutory", 67, 2100, 1785, 260), ov_product("retirementDepot", 70, 600, 600, 0, end=88)], 2600),
    ("o05-no-desired-income", "No desired income: no gap", {}, OV_ASSUMPTIONS,
     [ov_product("statutory", 67, 2100, 1785, 260), ov_product("etf", 67, 420, 0, 0, fixed=70, end=90)], None),
    ("o06-zero-rates-early-start", "Zero inflation and adjustment, ETF starts at 65 before the target age 67",
     dict(lifeExpectancyAge=85), dict(inflationPercent=0, pensionAdjustmentPercent=0),
     [ov_product("statutory", 67, 1700, 1445, 210), ov_product("etf", 65, 520, 0, 0, fixed=70, end=80)], 1900),
    ("o07-large-income-progression", "High pensions of all three kinds: tariff progression on the sum", {},
     OV_ASSUMPTIONS, [ov_product("statutory", 67, 3600, 3060, 445),
                      ov_product("retirementDepot", 67, 1800, 1800, 0, end=85),
                      ov_product("occupational", 67, 1200, 1200, 150, end=90)], 6000),
]


def ov_factor(p, age, a):
    if age < p["payoutStartAge"]:
        return 0.0
    if p.get("payoutEndAge") is not None and age >= p["payoutEndAge"]:
        return 0.0
    infl = 1 + a["inflationPercent"] / 100
    y = age - p["payoutStartAge"]
    if p["productId"] == "statutory":
        return ((1 + a["pensionAdjustmentPercent"] / 100) / infl) ** y
    return infl ** -y


def ov_incomes(counted, sc, age, a):
    """(taxable, contributions) per month in today's purchasing power of every counted product at one age."""
    out = []
    for p in counted:
        f = ov_factor(p, age, a); r = p["results"][sc]
        taxable = r["taxableMonthlyReal"] * f
        if p["productId"] == "statutory" and f > 0:
            # the tax-free part of a statutory pension is a fixed euro amount; later increases are fully taxable
            tax_free = r["monthlyPensionReal"] - r["taxableMonthlyReal"]
            taxable = max(0.0, r["monthlyPensionReal"] * f - tax_free * (1 + a["inflationPercent"] / 100) ** -(age - p["payoutStartAge"]))
        out.append((taxable, r["contributionsMonthlyReal"] * f))
    return out


def ov_net_by_product(counted, sc, age, a):
    """Net per month of every counted product: gross minus own deductions minus the share of the tax on the sum."""
    inc = ov_incomes(counted, sc, age, a)
    taxable, contrib = sum(i[0] for i in inc), sum(i[1] for i in inc)
    total_tax = pension_tax_monthly(taxable, contrib)
    out = []
    for p, (t_i, _) in zip(counted, inc):
        f = ov_factor(p, age, a); r = p["results"][sc]
        share = total_tax * t_i / taxable if taxable > 0 else 0.0
        gross = r["monthlyPensionReal"] * f
        ded = (r["fixedTaxMonthlyReal"] + r["contributionsMonthlyReal"]) * f + share
        out.append(dict(productId=p["productId"], grossReal=gross, taxAndContributionsReal=ded, netReal=gross - ded))
    return out


def project_overview(prof, a, products, desired, current_year=2026):
    t, life = prof["targetRetirementAge"], prof["lifeExpectancyAge"]
    counted = [p for p in products if p["enabled"] and p["valid"]]
    ends = [p["payoutEndAge"] for p in counted if p.get("payoutEndAge") is not None and t < p["payoutEndAge"] <= life]
    out = dict(firstPayoutEndAge=min(ends) if ends else None, scenarios={})
    for sc in SCEN:
        by = ov_net_by_product(counted, sc, t, a)
        net = sum(x["netReal"] for x in by)
        path, total_gap = [], 0.0
        for age in range(t, life + 1):
            vals = {x["productId"]: x["netReal"] for x in ov_net_by_product(counted, sc, age, a)}
            tot = sum(vals.values())
            pt = dict(age=age, total=tot, byProduct=vals)
            if desired is not None:
                pt["gap"] = max(0.0, desired - tot)
                if age < life:
                    total_gap += 12 * pt["gap"]
            path.append(pt)
        lump_net = lump_gross = 0.0
        for p in counted:
            l = p["results"][sc].get("lumpSum")
            if l:
                inc = ov_incomes(counted, sc, p["payoutStartAge"], a)
                tax = lump_tax(sum(i[0] for i in inc), sum(i[1] for i in inc), l["grossReal"])
                lump_net += l["grossReal"] - tax; lump_gross += l["grossReal"]
        out["scenarios"][sc] = dict(
            net=net, gross=sum(x["grossReal"] for x in by), taxAndContributions=sum(x["taxAndContributionsReal"] for x in by),
            gap=None if desired is None else max(0.0, desired - net), surplus=None if desired is None else max(0.0, net - desired),
            lumpNetReal=lump_net, lumpGrossReal=lump_gross,
            totalGapReal=None if desired is None else total_gap, byProduct=by, path=path)
    return out


def xl_factor(age, start, end, stat, infl, adj):
    """Excel text of the activity factor of one product at an age (all arguments are cell references or terms)."""
    return (f"IF(AND({age}>={start},{age}<{end}),IF({stat}=1,((1+{adj}/100)/(1+{infl}/100))^({age}-{start}),"
            f"(1+{infl}/100)^-({age}-{start})),0)")


def xl_net_block(fcells, prows, cols, age_expr, infl):
    """Excel texts (taxable, contributions, gross, fixed tax) of one person's products at one age.
    fcells: factor cells; prows: rows of the product table; cols: dict with the column letters gross, taxable,
    contrib, fixed, start, stat; age_expr(row): text of the age of the product's owner."""
    def total(col):
        return "+".join(f"{fc}*${cols[col]}${pr}" for fc, pr in zip(fcells, prows)) or "0"
    taxable = "+".join(
        f"IF(${cols['stat']}${pr}=1,MAX(0,{fc}*${cols['gross']}${pr}-IF({fc}>0,(${cols['gross']}${pr}-${cols['taxable']}${pr})"
        f"*(1+{infl}/100)^-({age_expr(pr)}-${cols['start']}${pr}),0)),{fc}*${cols['taxable']}${pr})"
        for fc, pr in zip(fcells, prows)) or "0"
    return taxable, total("contrib"), total("gross"), total("fixed")


def ov_excel_sheet(wb, name, prof, a, products, desired, exp):
    ws = wb.create_sheet(name[:31])
    t, life = prof["targetRetirementAge"], prof["lifeExpectancyAge"]
    for r, (label, v) in enumerate([("target retirement age", t), ("life expectancy age", life),
                                    ("desired net income (blank = none)", desired), ("inflation % p.a.", a["inflationPercent"]),
                                    ("pension adjustment % p.a.", a["pensionAdjustmentPercent"])], start=2):
        ws.cell(row=r, column=1, value=label); ws.cell(row=r, column=2, value=v)
    # B2 target, B3 life, B4 desired, B5 inflation, B6 adjustment; neutral scenario only
    ws["A8"] = "product (neutral)"
    heads = ["statutory (1/0)", "start age", "end age (999 = lifelong)", "gross real", "taxable real", "contributions real",
             "fixed tax real", "counts (1/0)"]
    for c, h in enumerate(heads, start=2):
        ws.cell(row=8, column=c, value=h)
    # columns: B statutory, C start, D end, E gross, F taxable, G contributions, H fixed, I counts
    prows = []
    for j, p in enumerate(products):
        r = 9 + j; prows.append(r)
        res = p["results"]["neutral"] if p["valid"] else None
        ws.cell(row=r, column=1, value=p["productId"])
        ws.cell(row=r, column=2, value=1 if p["productId"] == "statutory" else 0)
        ws.cell(row=r, column=3, value=p["payoutStartAge"])
        ws.cell(row=r, column=4, value=p.get("payoutEndAge", 999))
        for col, key in [(5, "monthlyPensionReal"), (6, "taxableMonthlyReal"), (7, "contributionsMonthlyReal"), (8, "fixedTaxMonthlyReal")]:
            ws.cell(row=r, column=col, value=res[key] if res else 0)
        ws.cell(row=r, column=9, value=1 if (p["enabled"] and p["valid"]) else 0)
    n = len(products)
    head = 9 + n + 2
    ws.cell(row=head, column=1, value="age")
    for j in range(n):
        ws.cell(row=head, column=2 + j, value=f"factor {products[j]['productId']}")
    col = lambda k: chr(ord("A") + k - 1)
    zc, nc, gc = 2 + n, 3 + n, 4 + n
    for c, h in [(zc, "taxable income per year"), (nc, "total net Excel"), (gc, "gap Excel"), (gc + 1, "total Python"),
                 (gc + 2, "difference")]:
        ws.cell(row=head, column=c, value=h)
    path = exp["scenarios"]["neutral"]["path"]
    for i, pt in enumerate(path):
        r = head + 1 + i
        ws.cell(row=r, column=1, value=pt["age"])
        fcells = []
        for j, pr in enumerate(prows):
            f = "=" + xl_factor(f"$A{r}", f"$C${pr}", f"$D${pr}", f"$B${pr}", "$B$5", "$B$6") + f"*$I${pr}"
            ws.cell(row=r, column=2 + j, value=f); fcells.append(f"{col(2 + j)}{r}")
        t_, c_, g_, f_ = xl_net_block(
            fcells, prows, dict(gross="E", taxable="F", contrib="G", fixed="H", start="C", stat="B"),
            lambda pr: f"$A{r}", "$B$5")
        ws.cell(row=r, column=zc, value=f"=INT(MAX(0,12*({t_})-MIN(102,12*({t_}))-12*({c_})-36))")
        ws.cell(row=r, column=nc, value=f"=({g_})-({f_})-({c_})-({excel_tariff(f'{col(zc)}{r}')})/12")
        ws.cell(row=r, column=gc, value=f'=IF($B$4="","",MAX(0,$B$4-{col(nc)}{r}))')
        ws.cell(row=r, column=gc + 1, value=pt["total"])
        ws.cell(row=r, column=gc + 2, value=f"={col(nc)}{r}-{col(gc + 1)}{r}")
    last = head + len(path)
    r = last + 2
    ws.cell(row=r, column=1, value="totalGapReal Excel")
    ws.cell(row=r, column=2, value=f'=IF($B$4="","",12*SUMIF(A{head + 1}:A{last},"<"&$B$3,{col(gc)}{head + 1}:{col(gc)}{last}))')
    ws.cell(row=r + 1, column=1, value="totalGapReal Python")
    ws.cell(row=r + 1, column=2, value=exp["scenarios"]["neutral"]["totalGapReal"])
    ws.column_dimensions["A"].width = 36


# ---- Phase 4b-1: household overview ----------------------------------------------------------------
HH_OUT = OUT / "household"
HH_ASSUMPTIONS = dict(inflationPercent=2, pensionAdjustmentPercent=2.5)


def hh_person(pid, birth, retire, life):
    return dict(id=pid, name=pid, birthYear=birth, targetRetirementAge=retire, lifeExpectancyAge=life,
                childrenBirthYears=[])


# (name, description, persons, products by person, desired)
HH_CASES = [
    ("h01-couple-staggered", "Two persons born 3 years apart, different life expectancy, gap against 4,500",
     [hh_person("a", 1985, 67, 90), hh_person("b", 1988, 67, 85)],
     {"a": [ov_product("statutory", 67, 2100, 1785, 260), ov_product("retirementDepot", 67, 480, 480, 0, end=85, lump=12000)],
      "b": [ov_product("statutory", 67, 1550, 1320, 190), ov_product("occupational", 67, 330, 330, 45, end=80)]}, 4500),
    ("h02-different-retirement-ages", "One retires at 63, the partner at 67; the path starts with only one income",
     [hh_person("a", 1980, 63, 88), hh_person("b", 1982, 67, 90)],
     {"a": [ov_product("statutory", 63, 1800, 1530, 220), ov_product("etf", 63, 520, 0, 0, fixed=70, end=88)],
      "b": [ov_product("statutory", 67, 2250, 1915, 280)]}, 3000),
    ("h03-person-without-products", "The second person has only a disabled and an invalid product",
     [hh_person("a", 1985, 67, 90), hh_person("b", 1987, 67, 90)],
     {"a": [ov_product("statutory", 67, 2100, 1785, 260), ov_product("etf", 67, 600, 0, 0, fixed=100, end=90)],
      "b": [ov_product("retirementDepot", 67, 360, 360, 0, end=85, enabled=False),
            ov_product("occupational", 67, 0, 0, 0, end=85, valid=False)]}, 3500),
    ("h04-no-desired-income", "No common wish: no gap, only the path",
     [hh_person("a", 1985, 67, 90), hh_person("b", 1986, 65, 88)],
     {"a": [ov_product("statutory", 67, 2100, 1785, 260)], "b": [ov_product("statutory", 65, 1700, 1445, 210)]}, None),
    ("h05-surplus-zero-rates", "Zero inflation and adjustment, income above the wish: gap 0",
     [hh_person("a", 1984, 67, 85), hh_person("b", 1984, 67, 85)],
     {"a": [ov_product("statutory", 67, 2500, 2125, 310)], "b": [ov_product("statutory", 67, 2100, 1785, 260)]}, 2500),
    # Survivor's pension (11 s4.1a): statutory products only, so the Excel net of a person is the net of that product
    ("h06-survivor-new-law", "Partner a dies at 80, b receives 55 % of a's net statutory pension minus 40 % of own income above the free amount",
     [hh_person("a", 1985, 67, 80), hh_person("b", 1987, 67, 90)],
     {"a": [ov_product("statutory", 67, 2400, 2040, 300)], "b": [ov_product("statutory", 67, 600, 510, 70)]}, 3000,
     dict(survivorPension="new")),
    ("h07-survivor-old-law-wish", "Old law (60 %) and 70 % of the wish after the first death",
     [hh_person("a", 1983, 65, 82), hh_person("b", 1986, 67, 92)],
     {"a": [ov_product("statutory", 65, 2800, 2380, 340)], "b": [ov_product("statutory", 67, 450, 383, 55)]}, 3600,
     dict(survivorPension="old", survivorWishPercent=70)),
    ("h08-survivor-fully-credited", "The own income of b is far above the free amount: the survivor's pension is credited away",
     [hh_person("a", 1985, 67, 78), hh_person("b", 1985, 67, 90)],
     {"a": [ov_product("statutory", 67, 1500, 1275, 190)], "b": [ov_product("statutory", 67, 3300, 2805, 400)]}, 3500,
     dict(survivorPension="new")),
]

SURVIVOR_LEGAL = dict(pensionValue=42.52, rateNew=55, rateOld=60, freeFactor=26.4, creditedPercent=40)


def project_household(persons, a, products, desired, extra=None):
    extra = extra or {}
    for pr in persons:
        pr["start"], pr["end"] = pr["birthYear"] + pr["targetRetirementAge"], pr["birthYear"] + pr["lifeExpectancyAge"]
    first, snap, last = min(p["start"] for p in persons), max(p["start"] for p in persons), max(p["end"] for p in persons)
    out = dict(firstYear=first, snapshotYear=snap, lastYear=last, scenarios={})
    two = len(persons) == 2
    first_death = min(p["end"] for p in persons)
    dead, left = (sorted(persons, key=lambda p: p["end"]) + [None])[:2] if two else (None, None)
    survivor_on = bool(two and extra.get("survivorPension") and dead["end"] < left["end"])
    if survivor_on:
        out["survivor"] = dict(deceasedId=dead["id"], survivorId=left["id"], deathYear=dead["end"])
    wish_pct = extra.get("survivorWishPercent") if two else None
    L = SURVIVOR_LEGAL

    def own_by_product(pr, sc, y):
        age = y - pr["birthYear"]
        counted = [p for p in products[pr["id"]] if p["enabled"] and p["valid"]]
        if not (pr["targetRetirementAge"] <= age <= pr["lifeExpectancyAge"]):
            return {}
        return {x["productId"]: x["netReal"] for x in ov_net_by_product(counted, sc, age, a)}

    for sc in SCEN:
        path, total_gap = [], 0.0
        for y in range(first, last + 1):
            by, survivor_amount = {}, 0.0
            for pr in persons:
                by[pr["id"]] = sum(own_by_product(pr, sc, y).values())
            if survivor_on and dead["end"] < y <= left["end"]:
                base = own_by_product(dead, sc, dead["end"]).get("statutory", 0.0)
                rate = L["rateOld"] if extra["survivorPension"] == "old" else L["rateNew"]
                mine = own_by_product(left, sc, y)
                income = sum(mine.get(k, 0.0) for k in ("statutory", "occupational", "retirementDepot"))
                credited = L["creditedPercent"] / 100 * max(0.0, income - L["freeFactor"] * L["pensionValue"])
                survivor_amount = max(0.0, rate / 100 * base - credited)
                by[left["id"]] += survivor_amount
            tot = sum(by.values())
            pt = dict(year=y, total=tot, byPerson=by)
            if survivor_amount > 0:
                pt["survivor"] = {left["id"]: survivor_amount}
            wish = desired
            if desired is not None and wish_pct is not None and y > first_death:
                wish = desired * wish_pct / 100
            if wish is not None:
                pt["desired"] = wish
                pt["gap"] = max(0.0, wish - tot)
                if y < last:
                    total_gap += 12 * pt["gap"]
            path.append(pt)
        at = next(pt for pt in path if pt["year"] == snap)
        out["scenarios"][sc] = dict(
            net=at["total"], byPerson=at["byPerson"],
            gap=None if desired is None else max(0.0, at["desired"] - at["total"]),
            surplus=None if desired is None else max(0.0, at["total"] - at["desired"]),
            totalGapReal=None if desired is None else total_gap, path=path)
    return out


def hh_excel_sheet(wb, name, persons, a, products, desired, exp, extra=None):
    extra = extra or {}
    ws = wb.create_sheet(name[:31])
    ws["A2"], ws["B2"] = "desired net income (blank = none)", desired
    ws["A3"], ws["B3"] = "inflation % p.a.", a["inflationPercent"]
    ws["A4"], ws["B4"] = "pension adjustment % p.a.", a["pensionAdjustmentPercent"]
    ws["A5"], ws["B5"] = "last year", exp["lastYear"]
    hdr = ["person", "product", "birth", "retire age", "life age", "statutory (1/0)", "start age", "end age (999 = lifelong)",
           "gross real", "taxable real", "contributions real", "fixed tax real", "counts (1/0)"]
    for c, h in enumerate(hdr, start=1):
        ws.cell(row=7, column=c, value=h)
    # columns: A person, B product, C birth, D retire, E life, F statutory, G start, H end, I gross, J taxable, K contrib,
    # L fixed, M counts
    rows, rows_by_person = [], {pr["id"]: [] for pr in persons}
    for pr in persons:
        for p in products[pr["id"]]:
            r = 8 + len(rows)
            res = p["results"]["neutral"] if p["valid"] else None
            vals = [pr["id"], p["productId"], pr["birthYear"], pr["targetRetirementAge"], pr["lifeExpectancyAge"],
                    1 if p["productId"] == "statutory" else 0, p["payoutStartAge"], p.get("payoutEndAge", 999),
                    res["monthlyPensionReal"] if res else 0, res["taxableMonthlyReal"] if res else 0,
                    res["contributionsMonthlyReal"] if res else 0, res["fixedTaxMonthlyReal"] if res else 0,
                    1 if (p["enabled"] and p["valid"]) else 0]
            for c, v in enumerate(vals, start=1):
                ws.cell(row=r, column=c, value=v)
            rows.append(r); rows_by_person[pr["id"]].append(r)
    n = len(rows)
    head = 9 + n
    ws.cell(row=head, column=1, value="year")
    col = lambda k: chr(ord("A") + k - 1) if k <= 26 else "A" + chr(ord("A") + k - 27)
    for j, r in enumerate(rows):
        ws.cell(row=head, column=2 + j, value=f"factor row {r}")
    pc = {}  # person id -> (zvE column, net column)
    nxt = 2 + n
    for pr in persons:
        pc[pr["id"]] = (nxt, nxt + 1)
        ws.cell(row=head, column=nxt, value=f"taxable income per year {pr['id']}")
        ws.cell(row=head, column=nxt + 1, value=f"net {pr['id']}")
        nxt += 2
    surv = exp.get("survivor")
    sv = None
    if surv:
        L = SURVIVOR_LEGAL
        by_id = {pr["id"]: pr for pr in persons}
        ws["O2"], ws["P2"] = "death year of the first person", surv["deathYear"]
        ws["O3"], ws["P3"] = "last year of the survivor", by_id[surv["survivorId"]]["birthYear"] + by_id[surv["survivorId"]]["lifeExpectancyAge"]
        ws["O4"], ws["P4"] = "survivor pension rate %", L["rateOld"] if extra["survivorPension"] == "old" else L["rateNew"]
        ws["O5"], ws["P5"] = "credited %", L["creditedPercent"]
        ws["O6"], ws["P6"] = "free amount per month (factor x pension value)", L["freeFactor"] * L["pensionValue"]
        sv = nxt
        ws.cell(row=head, column=sv, value="survivor pension Excel")
        nxt += 1
    ws["O7"], ws["P7"] = "first death year", min(pr["birthYear"] + pr["lifeExpectancyAge"] for pr in persons)
    ws["O8"], ws["P8"] = "wish share after the first death", extra.get("survivorWishPercent", 100) / 100
    tc, gc = nxt, nxt + 1
    for c, h in [(tc, "total Excel"), (gc, "gap Excel"), (gc + 1, "total Python"), (gc + 2, "difference")]:
        ws.cell(row=head, column=c, value=h)
    path = exp["scenarios"]["neutral"]["path"]
    for i, pt in enumerate(path):
        r = head + 1 + i
        ws.cell(row=r, column=1, value=pt["year"])
        for j, pr_row in enumerate(rows):
            age = f"($A{r}-$C${pr_row})"
            f = (f"=IF(AND($M${pr_row}=1,{age}>=$D${pr_row},{age}<=$E${pr_row}),"
                 + xl_factor(age, f"$G${pr_row}", f"$H${pr_row}", f"$F${pr_row}", "$B$3", "$B$4") + ",0)")
            ws.cell(row=r, column=2 + j, value=f)
        for pr in persons:
            idx = [rows.index(x) for x in rows_by_person[pr["id"]]]
            fcells = [f"{col(2 + k)}{r}" for k in idx]
            prows = rows_by_person[pr["id"]]
            t_, c_, g_, f_ = xl_net_block(
                fcells, prows, dict(gross="I", taxable="J", contrib="K", fixed="L", start="G", stat="F"),
                lambda pr: f"($A{r}-$C${pr})", "$B$3")
            zc, nc = pc[pr["id"]]
            ws.cell(row=r, column=zc, value=f"=INT(MAX(0,12*({t_})-MIN(102,12*({t_}))-12*({c_})-36))")
            ws.cell(row=r, column=nc, value=f"=({g_})-({f_})-({c_})-({excel_tariff(f'{col(zc)}{r}')})/12")
        if sv:
            dnet, lnet = col(pc[surv["deceasedId"]][1]), col(pc[surv["survivorId"]][1])
            first_row, last_row = head + 1, head + len(path)
            base = f"SUMIF($A${first_row}:$A${last_row},$P$2,{dnet}${first_row}:{dnet}${last_row})"
            ws.cell(row=r, column=sv, value=(
                f"=IF(AND($A{r}>$P$2,$A{r}<=$P$3),MAX(0,$P$4/100*{base}-$P$5/100*MAX(0,{lnet}{r}-$P$6)),0)"))
        ws.cell(row=r, column=tc, value="=" + "+".join(f"{col(pc[pr['id']][1])}{r}" for pr in persons) + (f"+{col(sv)}{r}" if sv else ""))
        ws.cell(row=r, column=gc, value=f'=IF($B$2="","",MAX(0,$B$2*IF($A{r}>$P$7,$P$8,1)-{col(tc)}{r}))')
        ws.cell(row=r, column=gc + 1, value=pt["total"])
        ws.cell(row=r, column=gc + 2, value=f"={col(tc)}{r}-{col(gc + 1)}{r}")
    last = head + len(path)
    ws.cell(row=last + 2, column=1, value="totalGapReal Excel")
    ws.cell(row=last + 2, column=2, value=f'=IF($B$2="","",12*SUMIF(A{head + 1}:A{last},"<"&$B$5,{col(gc)}{head + 1}:{col(gc)}{last}))')
    ws.cell(row=last + 3, column=1, value="totalGapReal Python")
    ws.cell(row=last + 3, column=2, value=exp["scenarios"]["neutral"]["totalGapReal"])
    ws.column_dimensions["A"].width = 36


# ---- Phase 4a-2: ETF with payout ---------------------------------------------------------------
ETFP_OUT = OUT / "etf-payout"
ETFP_PROFILE = dict(birthYear=1985, targetRetirementAge=67, lifeExpectancyAge=90, childrenBirthYears=[])
ETFP_PLAN = dict(BASE, initialCapital=5000, monthlyContribution=250, ter=0.2, taxEnabled=True,
                 returnScenarios={"pessimistic": 3, "neutral": 5, "optimistic": 7}, inflationPercent=2)
# (name, description, plan overrides, assumption overrides, payoutStart, payoutEnd, useGlobal)
ETFP_CASES = [
    ("e01-basic", "Gain, tax above the allowance", {}, {}, 67, 90, True),
    ("e02-loss", "Loss: no tax, own negative returns", dict(returnScenarios={"pessimistic": -6, "neutral": -5, "optimistic": -4}), {}, 67, 90, False),
    ("e03-below-allowance", "Small plan: taxable amount below the allowance", dict(initialCapital=0, monthlyContribution=20), {}, 67, 90, True),
    ("e04-tax-off", "Tax switched off, early payout start", dict(taxEnabled=False), {}, 65, 85, True),
    ("e05-global-and-duration", "Own values ignored (global on), stated duration 20 is overridden", dict(durationYears=20, returnScenarios={"pessimistic": 1, "neutral": 2, "optimistic": 3}, inflationPercent=3, monthlyContribution=600), {}, 68, 92, True),
    ("e06-zero-payout-return", "Payout phase return 0", {}, dict(payoutPhaseReturnPercent=0), 67, 87, True),
    ("e07-start-in-november", "Today is month 11: the savings phase has 2 months in the first year", {}, {}, 67, 90, True, 11),
]


def project_etf_payout(plan, prof, a, tax, start, end, use_global, scenario, current_year=2026, current_month=1):
    years = prof["birthYear"] + start - current_year
    months = years * 12 - (current_month - 1)
    i = dict(plan, durationYears=years, taxEnabled=False)
    infl = a["inflationPercent"] if use_global else plan["inflationPercent"]
    if use_global:
        i["returnScenarios"] = a["returnScenarios"]
    sav = project(i, scenario, months)
    cap, paid = sav["grossFinalValue"], sav["totalContributions"]
    n = (end - start) * 12
    r = (1 + a["payoutPhaseReturnPercent"] / 100) ** (1 / 12) - 1
    w = cap / n if r == 0 else cap * r / (1 - (1 + r) ** -n)
    bal = cap
    for _ in range(n):
        bal = bal * (1 + r) - w
    assert abs(bal) < 1e-6 * max(1, cap)
    g = max(0.0, cap - paid) / cap if (plan["taxEnabled"] and cap > 0) else 0.0
    taxable = 12 * w * g * (1 - tax["partialExemptionRate"] / 100)
    tax_m = (max(0.0, taxable - tax["taxFreeAllowance"]) * tax["capitalGainsTaxRate"] / 100 / 12) if plan["taxEnabled"] else 0.0
    f = (1 + infl / 100) ** years
    return dict(durationYears=years, savingMonths=months, grossCapital=cap, totalContributions=paid, gainShare=g, monthlyNominal=w,
                taxMonthlyNominal=tax_m, grossReal=w / f, taxReal=tax_m / f, netReal=(w - tax_m) / f)


def etfp_excel_sheet(wb, name, plan, prof, a, tax, start, end, use_global, exp, current_month=1):
    ws = wb.create_sheet(name[:31])
    infl = a["inflationPercent"] if use_global else plan["inflationPercent"]
    assert plan["lumpSums"] == [] and plan["annualContributionIncreasePercent"] == 0
    assert plan["entryFeePercent"] == 0 and plan["custodyFeeEurPerYear"] == 0 and plan["custodyFeePercentPerYear"] == 0
    rows = [("initial capital", plan["initialCapital"]), ("monthly contribution", plan["monthlyContribution"]),
            ("TER %", plan["ter"]), ("birth year", prof["birthYear"]), ("payout start age", start),
            ("payout end age", end), ("payout phase return %", a["payoutPhaseReturnPercent"]),
            ("inflation % (global or own)", infl), ("current year", 2026), ("tax on (1/0)", 1 if plan["taxEnabled"] else 0),
            ("tax rate %", tax["capitalGainsTaxRate"]), ("partial exemption %", tax["partialExemptionRate"]),
            ("allowance EUR", tax["taxFreeAllowance"])]
    ws["A1"] = "inputs (column B); rows 15-17 gross return % per scenario"
    for n, (label, v) in enumerate(rows):
        ws.cell(n + 2, 1, label); ws.cell(n + 2, 2, v)
    # B2 capital, B3 rate, B4 TER, B5 birth, B6 start, B7 end, B8 payout return, B9 inflation, B10 current year,
    # B11 tax on, B12 rate, B13 exemption, B14 allowance
    ws["A15"], ws["A16"], ws["A17"], ws["A18"], ws["B18"] = "return % pessimistic", "return % neutral", "return % optimistic", "years", "=B5+B6-B10"
    ws["A19"], ws["B19"] = "current month (1-12)", current_month
    scen = ["pessimistic", "neutral", "optimistic"]
    for k, sc in enumerate(scen):
        ws.cell(15 + k, 2, a["returnScenarios"][sc] if use_global else plan["returnScenarios"][sc])
    hdr = ["metric", "scenario", "Excel", "Python", "difference"]
    for c, t in enumerate(hdr):
        ws.cell(20, 1 + c, t)
    row = 21
    for k, sc in enumerate(scen):
        e = exp[sc]; ret = f"$B${15 + k}"
        g = f"(1+({ret}-$B$4)/100)^(1/12)"; n = "($B$18*12-($B$19-1))"
        cap = f"($B$2*{g}^{n}+$B$3*{g}*({g}^{n}-1)/({g}-1))"
        paid = "($B$2+$B$3*($B$18*12-($B$19-1)))"
        months = "(($B$7-$B$6)*12)"
        r = "((1+$B$8/100)^(1/12)-1)"
        w = f"IF($B$8=0,{cap}/{months},{cap}*{r}/(1-(1+{r})^(-{months})))"
        gs = f"IF($B$11=1,MAX(0,{cap}-{paid})/{cap},0)"
        tax_m = f"IF($B$11=1,MAX(0,12*{w}*{gs}*(1-$B$13/100)-$B$14)*$B$12/100/12,0)"
        f = "(1+$B$9/100)^$B$18"
        items = [("grossCapital", cap, e["grossCapital"]), ("totalContributions", paid, e["totalContributions"]),
                 ("monthlyNominal", w, e["monthlyNominal"]), ("gainShare", gs, e["gainShare"]),
                 ("taxMonthlyNominal", tax_m, e["taxMonthlyNominal"]),
                 ("netReal", f"({w}-{tax_m})/{f}", e["netReal"])]
        for metric, formula, py in items:
            ws.cell(row, 1, metric); ws.cell(row, 2, sc); ws.cell(row, 3, "=" + formula); ws.cell(row, 4, py)
            ws.cell(row, 5, f"=C{row}-D{row}")
            row += 1
    ws.column_dimensions["A"].width = 40


# ---- Review 13 F-16: percent withdrawal strategy (ETF with payout) -----------------------------
WD_OUT = OUT / "withdrawal"
# (name, description, plan overrides, assumption overrides, payoutStart, payoutEnd, useGlobal, percent)
WD_CASES = [
    ("w01-four-percent", "4 % rule, capital lasts and a rest is left", {}, {}, 67, 90, True, 4),
    ("w02-depletes", "6 %: the capital is used up before the end age", {}, {}, 67, 90, True, 6),
    ("w03-zero-rates", "All rates 0: 5 % of the capital, constant", dict(returnScenarios={"pessimistic": 0, "neutral": 0, "optimistic": 0}, inflationPercent=0), dict(payoutPhaseReturnPercent=0, inflationPercent=0), 67, 90, False, 5),
    ("w04-tax-off", "Tax switched off, own inflation 3 %, payout 65 to 85", dict(taxEnabled=False, inflationPercent=3), {}, 65, 85, False, 4),
    ("w05-small-plan", "Small plan: first-year tax below the allowance", dict(initialCapital=0, monthlyContribution=20), {}, 67, 90, True, 4),
    ("w06-one-hundred-percent", "100 %: everything is paid in the first year", {}, {}, 67, 90, True, 100),
]


def withdrawal_sim(cap, n, r, percent, infl):
    """Month by month: payment = min(scheduled, capital with return); scheduled rises each year by the inflation."""
    start = cap * percent / 100 / 12
    bal, pays, depletion = cap, [], None
    for m in range(1, n + 1):
        sched = start * (1 + infl / 100) ** ((m - 1) // 12)
        due = bal * (1 + r)
        pay = min(sched, due)
        bal = due - pay
        if bal < 1e-6:
            bal = 0.0
        if bal == 0.0 and m < n and depletion is None and cap > 0:
            depletion = m
        pays.append(pay)
    return start, pays, depletion, bal


def project_etf_withdrawal(plan, prof, a, tax, start, end, use_global, percent, scenario, current_year=2026):
    years = prof["birthYear"] + start - current_year
    months = years * 12
    i = dict(plan, durationYears=years, taxEnabled=False)
    infl = a["inflationPercent"] if use_global else plan["inflationPercent"]
    if use_global:
        i["returnScenarios"] = a["returnScenarios"]
    sav = project(i, scenario, months)
    cap, paid = sav["grossFinalValue"], sav["totalContributions"]
    n = (end - start) * 12
    r = (1 + a["payoutPhaseReturnPercent"] / 100) ** (1 / 12) - 1
    w, pays, dep, rest = withdrawal_sim(cap, n, r, percent, infl)
    g = max(0.0, cap - paid) / cap if (plan["taxEnabled"] and cap > 0) else 0.0
    first = sum(pays[:12])
    taxable = first * g * (1 - tax["partialExemptionRate"] / 100)
    tax_m = (max(0.0, taxable - tax["taxFreeAllowance"]) * tax["capitalGainsTaxRate"] / 100 / 12) if plan["taxEnabled"] else 0.0
    f = (1 + infl / 100) ** years
    return dict(grossCapital=cap, gainShare=g, monthlyNominal=w, taxMonthlyNominal=tax_m, netReal=(w - tax_m) / f,
                grossReal=w / f, depletionAge=None if dep is None else start + dep / 12, remainingAtEnd=rest,
                paidFirstYear=first, totalPaid=sum(pays))


def wd_excel_sheet(wb, name, plan, prof, a, tax, start, end, use_global, percent, exp):
    ws = wb.create_sheet(name[:31])
    infl = a["inflationPercent"] if use_global else plan["inflationPercent"]
    ret = a["returnScenarios"]["neutral"] if use_global else plan["returnScenarios"]["neutral"]
    assert plan["lumpSums"] == [] and plan["annualContributionIncreasePercent"] == 0
    rows = [("initial capital", plan["initialCapital"]), ("monthly contribution", plan["monthlyContribution"]),
            ("TER %", plan["ter"]), ("birth year", prof["birthYear"]), ("payout start age", start),
            ("payout end age", end), ("payout phase return %", a["payoutPhaseReturnPercent"]),
            ("inflation %", infl), ("current year", 2026), ("tax on (1/0)", 1 if plan["taxEnabled"] else 0),
            ("tax rate %", tax["capitalGainsTaxRate"]), ("partial exemption %", tax["partialExemptionRate"]),
            ("allowance EUR", tax["taxFreeAllowance"]), ("neutral return %", ret), ("withdrawal %", percent)]
    for n, (label, v) in enumerate(rows):
        ws.cell(n + 1, 1, label); ws.cell(n + 1, 2, v)
    # B1 capital, B2 rate, B3 TER, B4 birth, B5 start, B6 end, B7 payout return, B8 inflation, B9 year, B10 tax on,
    # B11 rate, B12 exemption, B13 allowance, B14 return, B15 percent
    g_ = "(1+($B$14-$B$3)/100)^(1/12)"; n_ = "(($B$4+$B$5-$B$9)*12)"
    ws["A17"], ws["B17"] = "capital before tax", f"=$B$1*{g_}^{n_}+$B$2*{g_}*({g_}^{n_}-1)/({g_}-1)"
    ws["A18"], ws["B18"] = "contributions", f"=$B$1+$B$2*{n_}"
    ws["A19"], ws["B19"] = "monthly return", "=(1+$B$7/100)^(1/12)-1"
    ws["A20"], ws["B20"] = "start payment", "=$B$17*$B$15/100/12"
    ws["A21"], ws["B21"] = "gain share", "=IF($B$10=1,MAX(0,$B$17-$B$18)/$B$17,0)"
    ws["A22"], ws["B22"] = "paid in first year", "=SUM(D26:D37)"
    ws["A23"], ws["B23"] = "tax per month, first year", "=IF($B$10=1,MAX(0,$B$22*$B$21*(1-$B$12/100)-$B$13)*$B$11/100/12,0)"
    ws["A24"] = "month, scheduled, capital with return, payment, capital after (rows 26 ff.)"
    n = (end - start) * 12
    for m in range(1, n + 1):
        r_ = 25 + m
        ws.cell(r_, 1, m)
        ws.cell(r_, 2, f"=$B$20*(1+$B$8/100)^INT((A{r_}-1)/12)")
        ws.cell(r_, 3, f"=$B$17*(1+$B$19)" if m == 1 else f"=E{r_ - 1}*(1+$B$19)")
        ws.cell(r_, 4, f"=MIN(B{r_},C{r_})")
        ws.cell(r_, 5, f"=IF(C{r_}-D{r_}<0.000001,0,C{r_}-D{r_})")
    last = 25 + n
    cmp_ = [("monthlyNominal", "=B20", exp["monthlyNominal"]), ("grossCapital", "=B17", exp["grossCapital"]),
            ("taxMonthlyNominal", "=B23", exp["taxMonthlyNominal"]), ("remainingAtEnd", f"=E{last}", exp["remainingAtEnd"]),
            ("netReal", f"=(B20-B23)/(1+$B$8/100)^($B$4+$B$5-$B$9)", exp["netReal"])]
    for k, (label, formula, py) in enumerate(cmp_):
        ws.cell(1 + k, 4, label); ws.cell(1 + k, 5, formula); ws.cell(1 + k, 6, py); ws.cell(1 + k, 7, f"=E{1 + k}-F{1 + k}")
    ws.column_dimensions["A"].width = 40


# ---- Review 13 F-7b: advance lump-sum tax (Vorabpauschale, paragraph 18 InvStG) ---------------------------
# Own copy of the base interest rates (BMF letters 2018 to 2026, read 2026-11-20); the assumed rate applies to later years.
ADV_OUT = OUT / "advance"
ADVP_OUT = OUT / "advance-payout"
BASE_INTEREST = {2018: 0.87, 2019: 0.52, 2020: 0.07, 2021: -0.45, 2022: -0.05, 2023: 2.55, 2024: 2.29, 2025: 2.53, 2026: 3.2}
ADV_ASSUMED = 3.2
ADV_FACTOR = 70


def adv_params(start_year, start_month):
    return dict(baseEarningsFactorPercent=ADV_FACTOR, baseInterestByYear={str(k): v for k, v in BASE_INTEREST.items()},
                assumedBaseInterestPercent=ADV_ASSUMED, startYear=start_year, startMonth=start_month)


def base_interest(year):
    return BASE_INTEREST.get(year, ADV_ASSUMED)


def vp_amount(year, held, gain):
    """Base earnings limited to the gain, never negative."""
    return max(0.0, min(held * base_interest(year) * ADV_FACTOR / 10000, gain))


def vp_tax(vp, tax):
    return max(0.0, vp * (1 - tax["partialExemptionRate"] / 100) - tax["taxFreeAllowance"]) * tax["capitalGainsTaxRate"] / 100


def project_advance_savings(i, scenario, tax, start_year, start_month, months=None):
    """Monthly simulation; the advance lump sum of a calendar year is taken from the depot in December."""
    g = (1 + (i["returnScenarios"][scenario] - i["ter"]) / 100) ** (1 / 12)
    lumps = {}
    for l in i["lumpSums"]:
        lumps[l["month"]] = lumps.get(l["month"], 0) + l["amount"]
    n = i["durationYears"] * 12 if months is None else months
    value, paid = i["initialCapital"], i["initialCapital"]
    opened, inflow, weighted = 0.0, i["initialCapital"], i["initialCapital"] * (13 - start_month) / 12
    vp_total = tax_total = 0.0
    yearly = []
    year_vp = 0.0
    for m in range(1, n + 1):
        rate = i["monthlyContribution"] * (1 + i["annualContributionIncreasePercent"] / 100) ** ((m - 1) // 12)
        pay = rate + lumps.get(m, 0)
        paid += pay
        grown = (value + pay * (1 - i["entryFeePercent"] / 100)) * g
        value = max(0.0, grown - i["custodyFeeEurPerYear"] / 12 - grown * i["custodyFeePercentPerYear"] / 1200)
        cal_month = (start_month - 1 + m - 1) % 12 + 1
        cal_year = start_year + (start_month - 1 + m - 1) // 12
        net = pay * (1 - i["entryFeePercent"] / 100)
        inflow += net
        weighted += net * (13 - cal_month) / 12
        if cal_month == 12:
            vp = vp_amount(cal_year, opened + weighted, value - opened - inflow)
            t = min(value, vp_tax(vp, tax))
            value -= t
            vp_total += vp
            tax_total += t
            year_vp += vp
            opened, inflow, weighted = value, 0.0, 0.0
        if m % 12 == 0:
            yearly.append(year_vp)
            year_vp = 0.0
    return dict(value=value, paid=paid, vp_total=vp_total, tax_paid=tax_total, yearly=yearly)


def sale_tax_with_advance(value, paid, vp_total, tax_paid, tax):
    gain = value - paid + tax_paid
    base = gain - vp_total
    if gain <= 0 or base <= 0:
        return gain, 0.0
    return gain, max(0.0, base * (1 - tax["partialExemptionRate"] / 100) - tax["taxFreeAllowance"]) * tax["capitalGainsTaxRate"] / 100


# (name, description, plan overrides, tax overrides, start year, start month)
ADV_CASES = [
    ("va01-basic", "20 years from January 2026, allowance used every year", {}, {}, 2026, 1),
    ("va02-july-start-costs-lumps", "Start in July, lump sums, entry and custody fees, rate increase", dict(
        durationYears=15, lumpSums=[{"month": 3, "amount": 4000}, {"month": 30, "amount": 2000}], entryFeePercent=1,
        custodyFeeEurPerYear=12, custodyFeePercentPerYear=0.1, annualContributionIncreasePercent=3), {}, 2026, 7),
    ("va03-start-2021-zero-years", "Start 2021: base interest negative in 2021 and 2022, so no advance lump sum then", dict(
        durationYears=10, initialCapital=20000), {}, 2021, 1),
    ("va04-capped-by-gain", "Low returns: the gain of the year limits the advance lump sum, negative return gives none", dict(
        initialCapital=60000, monthlyContribution=100, durationYears=8, ter=0.2,
        returnScenarios={"pessimistic": -2, "neutral": 1, "optimistic": 4}), {}, 2026, 1),
    ("va05-church-tax-no-allowance", "Rate with church tax 27.995 %, no allowance", dict(initialCapital=10000), dict(
        capitalGainsTaxRate=27.995, taxFreeAllowance=0), 2026, 1),
]


def adv_expected(plan, tax, scenario, start_year, start_month):
    s = project_advance_savings(plan, scenario, tax, start_year, start_month)
    gain, sale = sale_tax_with_advance(s["value"], s["paid"], s["vp_total"], s["tax_paid"], tax)
    after = s["value"] - sale
    return dict(grossFinalValue=s["value"], totalContributions=s["paid"], advanceLumpSumTotal=s["vp_total"],
                advanceTaxPaid=s["tax_paid"], gainBeforeTax=gain, tax=sale, finalValueAfterTax=after,
                finalValueReal=after / (1 + plan["inflationPercent"] / 100) ** plan["durationYears"],
                yearlyAdvanceLumpSum=s["yearly"])


# (name, description, plan overrides, assumption overrides, payoutStart, payoutEnd, useGlobal, current month)
ADVP_CASES = [
    ("vap01-basic", "Savings with advance lump sum, payout years with advance lump sum", {}, {}, 67, 90, True, 1),
    ("vap02-start-in-november", "Today is month 11: two savings months in the first year", {}, {}, 67, 90, True, 11),
    ("vap03-zero-payout-return", "Payout return 0: no growth, so no advance lump sum in the payout years", {}, dict(payoutPhaseReturnPercent=0), 67, 87, True, 1),
    ("vap04-small-plan", "Small plan: allowance covers most of the tax", dict(initialCapital=0, monthlyContribution=60), {}, 67, 90, True, 1),
    ("vap05-early-start-short-payout", "Payout from 60 to 75, own return values", dict(returnScenarios={"pessimistic": 2, "neutral": 4, "optimistic": 6}, monthlyContribution=400), {}, 60, 75, False, 1),
]


def project_advance_payout(plan, prof, a, tax, start, end, use_global, scenario, current_year, current_month):
    years = prof["birthYear"] + start - current_year
    months = years * 12 - (current_month - 1)
    i = dict(plan, durationYears=years, taxEnabled=False)
    infl = a["inflationPercent"] if use_global else plan["inflationPercent"]
    if use_global:
        i["returnScenarios"] = a["returnScenarios"]
    s = project_advance_savings(i, scenario, tax, current_year, current_month, months)
    cap, paid = s["value"], s["paid"]
    n = (end - start) * 12
    ret = a["payoutPhaseReturnPercent"] / 100
    r = (1 + ret) ** (1 / 12) - 1
    w = cap / n if r == 0 else cap * r / (1 - (1 + r) ** -n)
    basis = paid - s["tax_paid"]
    gs = max(0.0, cap - basis) / cap if cap > 0 else 0.0
    pool, tax_total, vp_payout = s["vp_total"], 0.0, 0.0
    bal = cap
    year = prof["birthYear"] + start
    for from_m in range(0, n, 12):
        m_in = min(12, n - from_m)
        for _ in range(m_in):
            bal = bal * (1 + r) - w
        end_bal = 0.0 if from_m + m_in == n else bal
        growth = (1 + ret) ** (m_in / 12)
        held = end_bal / growth
        vp = vp_amount(year, held, end_bal - held)
        realised = gs * w * m_in
        used = min(pool, realised)
        taxable = max(0.0, (vp + realised - used) * (1 - tax["partialExemptionRate"] / 100) - tax["taxFreeAllowance"])
        tax_total += taxable * tax["capitalGainsTaxRate"] / 100
        vp_payout += vp
        pool += vp - used
        year += 1
    assert abs(bal) < 1e-6 * max(1, cap)
    tax_m = tax_total / n
    f = (1 + infl / 100) ** years
    return dict(durationYears=years, savingMonths=months, grossCapital=cap, totalContributions=paid, gainShare=gs,
                monthlyNominal=w, taxMonthlyNominal=tax_m, grossReal=w / f, taxReal=tax_m / f, netReal=(w - tax_m) / f,
                advanceLumpSumSaving=s["vp_total"], advanceTaxSaving=s["tax_paid"], advanceLumpSumPayout=vp_payout)


def adv_save_block(ws, top, col0, scen_name, ret_cell, n, plan, start_cell_year, start_cell_month, last_col_label):
    """Monthly savings table for one scenario in columns col0.. (value, open, inflow, weighted, lump sum, tax, value after tax).
    Shared columns: A month, B calendar month, C calendar year, D contribution, E lump sum. Inputs on the sheet:
    B2 initial, B3 monthly, B4 increase %, B6 TER %, B7 entry %, B8 custody EUR, B9 custody %, B12 factor, B13 allowance,
    B14 rate %, B15 exemption %, B10 start year, B11 start month, E-table of base interest in columns N:O (rows 2..)."""
    from openpyxl.utils import get_column_letter as L
    cV, cO, cI, cW, cK, cT, cM = [L(col0 + k) for k in range(7)]
    ws.cell(top - 1, col0, f"value before advance tax {scen_name}")
    for k, h in enumerate(["open", "inflow", "weighted", "lump sum", "tax", "value after"]):
        ws.cell(top - 1, col0 + 1 + k, f"{h} {scen_name}")
    g = f"(1+({ret_cell}-$B$6)/100)^(1/12)"
    first = top + 1
    ws[f"{cM}{first}"] = "=$B$2"
    for m in range(1, n + 1):
        r = first + m
        p = r - 1
        net = f"($D{r}+$E{r})*(1-$B$7/100)"
        grown = f"({cM}{p}+{net})*{g}"
        ws[f"{cV}{r}"] = f"=MAX(0,{grown}-$B$8/12-({grown})*$B$9/1200)"
        if m == 1:
            ws[f"{cO}{r}"] = 0
            ws[f"{cI}{r}"] = f"=$B$2+{net}"
            ws[f"{cW}{r}"] = f"=$B$2*(13-$B$11)/12+{net}*(13-$B{r})/12"
        else:
            ws[f"{cO}{r}"] = f"=IF($B{p}=12,{cM}{p},{cO}{p})"
            ws[f"{cI}{r}"] = f"=IF($B{p}=12,0,{cI}{p})+{net}"
            ws[f"{cW}{r}"] = f"=IF($B{p}=12,0,{cW}{p})+{net}*(13-$B{r})/12"
        rate = f"IFERROR(VLOOKUP($C{r},$AX$2:$AY$40,2,FALSE),$B$16)"
        ws[f"{cK}{r}"] = f"=IF($B{r}=12,MAX(0,MIN(({cO}{r}+{cW}{r})*{rate}*$B$12/10000,{cV}{r}-{cO}{r}-{cI}{r})),0)"
        ws[f"{cT}{r}"] = f"=IF($B{r}=12,MIN({cV}{r},MAX(0,{cK}{r}*(1-$B$15/100)-$B$13)*$B$14/100),0)"
        ws[f"{cM}{r}"] = f"={cV}{r}-{cT}{r}"
    last = first + n
    return dict(first=first, last=last, value=f"{cM}{last}", lump=f"SUM({cK}{first + 1}:{cK}{last})", tax=f"SUM({cT}{first + 1}:{cT}{last})")


def adv_sheet_header(ws, plan, tax, start_year, start_month, n, years_for_rows):
    labels = [("initial capital", plan["initialCapital"]), ("monthly contribution", plan["monthlyContribution"]),
              ("annual increase %", plan["annualContributionIncreasePercent"]), ("years", years_for_rows),
              ("TER %", plan["ter"]), ("entry fee %", plan["entryFeePercent"]), ("custody EUR/year", plan["custodyFeeEurPerYear"]),
              ("custody %/year", plan["custodyFeePercentPerYear"]), ("start year", start_year), ("start month", start_month),
              ("base earnings factor %", ADV_FACTOR), ("allowance EUR", tax["taxFreeAllowance"]),
              ("tax rate %", tax["capitalGainsTaxRate"]), ("partial exemption %", tax["partialExemptionRate"]),
              ("assumed base interest %", ADV_ASSUMED), ("inflation %", plan["inflationPercent"])]
    for k, (label, v) in enumerate(labels):
        ws.cell(k + 2, 1, label); ws.cell(k + 2, 2, v)
    ws["AX1"], ws["AY1"] = "year", "base interest %"
    for k, (y, v) in enumerate(sorted(BASE_INTEREST.items())):
        ws.cell(k + 2, 50, y); ws.cell(k + 2, 51, v)


def adv_table_frame(ws, top, n, plan):
    lumps = {}
    for l in plan["lumpSums"]:
        lumps[l["month"]] = lumps.get(l["month"], 0) + l["amount"]
    for c, h in enumerate(["month", "calendar month", "calendar year", "contribution", "lump sum"], start=1):
        ws.cell(top, c, h)
    for m in range(1, n + 1):
        r = top + 1 + m
        ws.cell(r, 1, m)
        ws.cell(r, 2, f"=MOD($B$11-1+A{r}-1,12)+1")
        ws.cell(r, 3, f"=$B$10+INT(($B$11-1+A{r}-1)/12)")
        ws.cell(r, 4, f"=$B$3*(1+$B$4/100)^INT((A{r}-1)/12)")
        ws.cell(r, 5, lumps.get(m, 0))


def adv_excel_sheet(wb, name, plan, tax, start_year, start_month, exp):
    ws = wb.create_sheet(name[:31])
    n = plan["durationYears"] * 12
    adv_sheet_header(ws, plan, tax, start_year, start_month, n, plan["durationYears"])
    top = 22
    adv_table_frame(ws, top, n, plan)
    ws["BA1"], ws["BB1"], ws["BC1"], ws["BD1"], ws["BE1"] = "metric", "scenario", "Excel", "Python", "difference"
    row = 2
    for k, sc in enumerate(SCEN):
        ret = ["$F$18", "$G$18", "$H$18"][k]
        ws.cell(17, 6 + k, f"return % {sc}"); ws.cell(18, 6 + k, plan["returnScenarios"][sc])
        blk = adv_save_block(ws, top, 7 + 7 * k, sc, ret, n, plan, None, None, None)
        gross, paid = blk["value"], f"(SUM($D${top + 2}:$E${top + 1 + n})+$B$2)"
        gain = f"({gross}-{paid}+{blk['tax']})"
        base = f"({gain}-{blk['lump']})"
        sale = f"IF(AND({gain}>0,{base}>0),MAX(0,{base}*(1-$B$15/100)-$B$13)*$B$14/100,0)"
        e = exp[sc]
        items = [("grossFinalValue", f"={gross}", e["grossFinalValue"]), ("totalContributions", f"={paid}", e["totalContributions"]),
                 ("advanceLumpSumTotal", f"={blk['lump']}", e["advanceLumpSumTotal"]),
                 ("advanceTaxPaid", f"={blk['tax']}", e["advanceTaxPaid"]), ("tax", f"={sale}", e["tax"]),
                 ("finalValueAfterTax", f"={gross}-{sale}", e["finalValueAfterTax"]),
                 ("finalValueReal", f"=({gross}-{sale})/(1+$B$17/100)^$B$5", e["finalValueReal"])]
        for metric, formula, py in items:
            ws.cell(row, 53, metric); ws.cell(row, 54, sc); ws.cell(row, 55, formula); ws.cell(row, 56, py)
            ws.cell(row, 57, f"=BC{row}-BD{row}")
            row += 1


def advp_excel_sheet(wb, name, plan, prof, a, tax, start, end, use_global, exp, current_year, current_month):
    ws = wb.create_sheet(name[:31])
    years = prof["birthYear"] + start - current_year
    n = years * 12 - (current_month - 1)
    adv_sheet_header(ws, plan, tax, current_year, current_month, n, years)
    infl = a["inflationPercent"] if use_global else plan["inflationPercent"]
    ws["B17"] = infl
    ws["A18"], ws["A19"], ws["B19"] = "savings returns in F18:H18", "payout phase return %", a["payoutPhaseReturnPercent"]
    ws["A20"], ws["B20"], ws["A21"], ws["B21"] = "payout months", (end - start) * 12, "payout first year", prof["birthYear"] + start
    top = 24
    plan_i = dict(plan)
    adv_table_frame(ws, top, n, plan_i)
    ws["BA1"], ws["BB1"], ws["BC1"], ws["BD1"], ws["BE1"] = "metric", "scenario", "Excel", "Python", "difference"
    row = 2
    ylen = (end - start)
    for k, sc in enumerate(SCEN):
        ret_val = a["returnScenarios"][sc] if use_global else plan["returnScenarios"][sc]
        ws.cell(18, 6 + k, ret_val)
        ret = ["$F$18", "$G$18", "$H$18"][k]
        blk = adv_save_block(ws, top, 7 + 7 * k, sc, ret, n, plan, None, None, None)
        cap = blk["value"]
        paid = f"($B$2+SUM($D${top + 2}:$E${top + 1 + n}))"
        basis = f"({paid}-{blk['tax']})"
        r = "((1+$B$19/100)^(1/12)-1)"
        w = f"IF($B$19=0,{cap}/$B$20,{cap}*{r}/(1-(1+{r})^(-$B$20)))"
        gs = f"IF({cap}>0,MAX(0,{cap}-{basis})/{cap},0)"
        # yearly payout table: one row per payout year, columns per scenario block
        c0 = 7 + 7 * 3 + 1 + 6 * k
        from openpyxl.utils import get_column_letter as L
        cols = [L(c0 + j) for j in range(6)]
        cEnd, cVp, cReal, cUsed, cPoolEnd, cTx = cols
        ws.cell(top - 1, c0, f"remaining {sc}")
        for j, h in enumerate(["lump sum", "realised gain", "credit used", "pool end", "tax"]):
            ws.cell(top - 1, c0 + 1 + j, f"{h} {sc}")
        for y in range(ylen):
            rr = top + 2 + y
            m0 = f"MIN(12*{y},$B$20)"
            m1 = f"MIN(12*{y + 1},$B$20)"
            mi = f"({m1}-{m0})"
            ri = f"(1+{r})"
            bal = f"IF($B$19=0,{cap}-{w}*{m1},{cap}*{ri}^{m1}-{w}*({ri}^{m1}-1)/{r})"
            ws[f"{cEnd}{rr}"] = f"=IF({m1}>=$B$20,0,{bal})"
            growth = f"((1+$B$19/100)^({mi}/12))"
            held = f"({cEnd}{rr}/{growth})"
            rate = f"IFERROR(VLOOKUP($B$21+{y},$AX$2:$AY$40,2,FALSE),$B$16)"
            ws[f"{cVp}{rr}"] = f"=MAX(0,MIN({held}*{rate}*$B$12/10000,{cEnd}{rr}-{held}))"
            ws[f"{cReal}{rr}"] = f"={gs}*{w}*{mi}"
            pool_prev = blk["lump"] if y == 0 else f"{cPoolEnd}{rr - 1}"
            ws[f"{cUsed}{rr}"] = f"=MIN({pool_prev},{cReal}{rr})"
            ws[f"{cPoolEnd}{rr}"] = f"={pool_prev}+{cVp}{rr}-{cUsed}{rr}"
            ws[f"{cTx}{rr}"] = f"=MAX(0,({cVp}{rr}+{cReal}{rr}-{cUsed}{rr})*(1-$B$15/100)-$B$13)*$B$14/100"
        yr0, yr1 = top + 2, top + 1 + ylen
        tax_m = f"SUM({cTx}{yr0}:{cTx}{yr1})/$B$20"
        f = f"(1+$B$17/100)^{years}"
        e = exp[sc]
        items = [("grossCapital", f"={cap}", e["grossCapital"]), ("totalContributions", f"={paid}", e["totalContributions"]),
                 ("advanceLumpSumSaving", f"={blk['lump']}", e["advanceLumpSumSaving"]),
                 ("advanceTaxSaving", f"={blk['tax']}", e["advanceTaxSaving"]),
                 ("gainShare", f"={gs}", e["gainShare"]), ("monthlyNominal", f"={w}", e["monthlyNominal"]),
                 ("advanceLumpSumPayout", f"=SUM({cVp}{yr0}:{cVp}{yr1})", e["advanceLumpSumPayout"]),
                 ("taxMonthlyNominal", f"={tax_m}", e["taxMonthlyNominal"]),
                 ("netReal", f"=({w}-{tax_m})/({f})", e["netReal"])]
        for metric, formula, py in items:
            ws.cell(row, 53, metric); ws.cell(row, 54, sc); ws.cell(row, 55, formula); ws.cell(row, 56, py)
            ws.cell(row, 57, f"=BC{row}-BD{row}")
            row += 1


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    ADV_OUT.mkdir(parents=True, exist_ok=True)
    ADVP_OUT.mkdir(parents=True, exist_ok=True)
    GOAL_OUT.mkdir(parents=True, exist_ok=True)
    GOAL_SHARED_OUT.mkdir(parents=True, exist_ok=True)
    TARGET_OUT.mkdir(parents=True, exist_ok=True)
    STAT_OUT.mkdir(parents=True, exist_ok=True)
    DEPOT_OUT.mkdir(parents=True, exist_ok=True)
    BAV_OUT.mkdir(parents=True, exist_ok=True)
    OV_OUT.mkdir(parents=True, exist_ok=True)
    ETFP_OUT.mkdir(parents=True, exist_ok=True)
    HH_OUT.mkdir(parents=True, exist_ok=True)
    wb = Workbook(); wb.remove(wb.active)
    for name, desc, over in CASES:
        i = {**BASE, **over}
        expected = {sc: project(i, sc) for sc in ["pessimistic", "neutral", "optimistic"]}
        if i["ter"] == 0 and i["entryFeePercent"] == 0 and i["custodyFeeEurPerYear"] == 0 and \
                i["custodyFeePercentPerYear"] == 0 and not i["lumpSums"] and i["annualContributionIncreasePercent"] == 0:
            g = (1 + i["returnScenarios"]["neutral"] / 100) ** (1 / 12); n = i["durationYears"] * 12
            closed = i["initialCapital"] * g ** n + i["monthlyContribution"] * g * (g ** n - 1) / (g - 1)
            assert math.isclose(closed, expected["neutral"]["grossFinalValue"], rel_tol=1e-9), name
        (OUT / f"{name}.json").write_text(json.dumps(
            {"name": name, "description": desc, "synthetic": True, "input": i, "tax": TAX, "expected": expected}, indent=2) + "\n")
        excel_sheet(wb, name, i, expected)
    for name, desc, over in GOAL_CASES:
        g = {**GOAL_BASE, **over}
        expected = project_goal(g)
        (GOAL_OUT / f"{name}.json").write_text(json.dumps(
            {"name": name, "description": desc, "synthetic": True, "input": g, "tax": GOAL_TAX, "expected": expected}, indent=2) + "\n")
        goal_excel_sheet(wb, name, g, expected, g["monthlyContribution"], "inputs as in the vector")
        req = expected.get("requiredMonthlyForTargetMonth")
        if req and req["status"] == "ok":
            gm = month_idx(g["targetMonth"]) - month_idx(g["startMonth"])
            g2 = {**g, "monthlyContribution": req["monthly"]}
            sim = sim_goal(g2, req["monthly"], gm, gm, False)
            exp2 = dict(status="reached", monthsToReach=sim_goal(g2, req["monthly"], HORIZON, gm, True)["reached"],
                        finalBalance=sim["balance"], interestGross=sim["gross"], tax=sim["tax"],
                        interestNet=sim["gross"] - sim["tax"], seriesLength=gm + 1)
            goal_excel_sheet(wb, ("r" + name)[:31], g2, exp2, req["monthly"],
                             "monthly = required rate from Python; balance at the target month must be >= target")
    for name, desc, pool, goals in GOAL_SHARED_CASES:
        used, prev, entries = {}, [], []
        for gi in sorted(range(len(goals)), key=lambda k: (goals[k]["priority"], k)):
            g = {**GOAL_BASE, **goals[gi], "taxFreeAllowancePerYear": pool}
            exp = project_goal(g, lambda y, used=used, pool=pool: max(0.0, pool - used.get(y, 0.0)), used)
            entries.append(dict(id=g["id"], input=g, expected=exp))
        by_id = {e["id"]: e for e in entries}
        (GOAL_SHARED_OUT / f"{name}.json").write_text(json.dumps(
            {"name": name, "description": desc, "synthetic": True, "tax": GOAL_TAX, "pool": pool,
             "goals": [{**by_id[g["id"]]["input"]} for g in [{**GOAL_BASE, **x} for x in goals]],
             "expected": {e["id"]: e["expected"] for e in entries}}, indent=2) + "\n")
        for k, e in enumerate(entries):
            last = goal_excel_sheet(wb, f"{name[:26]}-{e['id']}"[:31], e["input"], e["expected"], e["input"]["monthlyContribution"],
                                    f"shared pool {pool}; goal {k + 1} of {len(entries)} in priority order", pool=pool, prev=tuple(prev))
            prev.append((f"{name[:26]}-{e['id']}"[:31], last))
    for name, desc, over, tv, basis in TARGET_CASES:
        i = {**BASE, **over}
        target_nominal = tv * (1 + i["inflationPercent"] / 100) ** i["durationYears"] if basis == "real" else tv
        scenarios = {}
        for sc in ["pessimistic", "neutral", "optimistic"]:
            st, monthly = solve_etf(i, sc, target_nominal)
            scenarios[sc] = {"status": st, "monthly": monthly,
                             "differenceToCurrent": monthly - i["monthlyContribution"]}
        (TARGET_OUT / f"{name}.json").write_text(json.dumps(
            {"name": name, "description": desc, "synthetic": True, "input": i, "tax": TAX, "targetValue": tv,
             "basis": basis, "expected": {"targetNominal": target_nominal, "scenarios": scenarios}}, indent=2) + "\n")
        if scenarios["neutral"]["status"] == "ok":
            excel_target_sheet(wb, name, i, scenarios, scenarios["neutral"]["monthly"], target_nominal)
    for name, desc, io, po, ao in STAT_CASES:
        inp = {**STAT_INPUT, **io}; prof = {**STAT_PROFILE, **po}; a = {**STAT_ASSUMPTIONS, **ao}
        exp = project_statutory(inp, prof, a)
        (STAT_OUT / f"{name}.json").write_text(json.dumps(
            {"name": name, "description": desc, "synthetic": True, "input": inp, "profile": prof,
             "assumptions": a, "legal": STAT_LEGAL, "currentYear": 2026, "expected": exp}, indent=2) + "\n")
        stat_excel_sheet(wb, name, inp, prof, a, exp)
    for name, desc, scenario, io, po, ao in DEPOT_CASES:
        inp = {**DEPOT_INPUT, **io}; prof = {**DEPOT_PROFILE, **po}; a = {**STAT_ASSUMPTIONS, **ao}
        exp = project_depot(inp, prof, a, scenario)
        (DEPOT_OUT / f"{name}.json").write_text(json.dumps(
            {"name": name, "description": desc, "synthetic": True, "scenario": scenario, "input": inp,
             "profile": prof, "assumptions": a, "depotLegal": DEPOT_LEGAL, "currentYear": 2026, "expected": exp},
            indent=2) + "\n")
        depot_excel_sheet(wb, name, inp, prof, a, scenario, exp)
    for name, desc, scenario, io, po, ao in BAV_CASES:
        inp = {**BAV_INPUT, **io}; prof = {**BAV_PROFILE, **po}; a = {**STAT_ASSUMPTIONS, **ao}
        exp = project_bav(inp, prof, a, scenario)
        (BAV_OUT / f"{name}.json").write_text(json.dumps(
            {"name": name, "description": desc, "synthetic": True, "scenario": scenario, "input": inp,
             "profile": prof, "assumptions": a, "legal": STAT_LEGAL, "currentYear": 2026, "expected": exp},
            indent=2) + "\n")
        bav_excel_sheet(wb, name, inp, prof, a, scenario, exp)
    for name, desc, po, ao, products, desired in OV_CASES:
        prof = {**OV_PROFILE, **po}; a = {**STAT_ASSUMPTIONS, **ao}
        exp = project_overview(prof, a, products, desired)
        prof_out = {**prof, **({} if desired is None else {"desiredMonthlyIncomeToday": desired})}
        (OV_OUT / f"{name}.json").write_text(json.dumps(
            {"name": name, "description": desc, "synthetic": True, "profile": prof_out, "assumptions": a,
             "currentYear": 2026, "products": products, "expected": exp}, indent=2) + "\n")
        ov_excel_sheet(wb, name, prof, a, products, desired, exp)
    for name, desc, po, ao, start, end, use_global, *rest in ETFP_CASES:
        month = rest[0] if rest else 1
        plan = {**ETFP_PLAN, **po}; a = {**STAT_ASSUMPTIONS, **ao}
        exp = {sc: project_etf_payout(plan, ETFP_PROFILE, a, TAX, start, end, use_global, sc, 2026, month) for sc in SCEN}
        (ETFP_OUT / f"{name}.json").write_text(json.dumps(
            {"name": name, "description": desc, "synthetic": True, "plan": plan, "tax": TAX, "taxUnverified": True,
             "payoutStartAge": start, "payoutEndAge": end, "useGlobalAssumptions": use_global,
             "profile": ETFP_PROFILE, "assumptions": a, "currentYear": 2026, "currentMonth": month, "expected": exp}, indent=2) + "\n")
        etfp_excel_sheet(wb, name, plan, ETFP_PROFILE, a, TAX, start, end, use_global, exp, month)
    for name, desc, persons, products, desired, *rest in HH_CASES:
        extra = rest[0] if rest else {}
        a = {**STAT_ASSUMPTIONS, **(dict(inflationPercent=0, pensionAdjustmentPercent=0) if name.startswith("h05") else HH_ASSUMPTIONS)}
        exp = project_household([dict(p) for p in persons], a, products, desired, extra)
        (HH_OUT / f"{name}.json").write_text(json.dumps(
            {"name": name, "description": desc, "synthetic": True, "persons": persons, "assumptions": a,
             "desiredMonthlyIncomeToday": desired, "currentYear": 2026, "products": products, **extra, "expected": exp}, indent=2) + "\n")
        hh_excel_sheet(wb, name, [dict(p) for p in persons], a, products, desired, exp, extra)
    for name, desc, po, to, sy, sm in ADV_CASES:
        plan = {**ETFP_PLAN, "lumpSums": [], "annualContributionIncreasePercent": 0, "entryFeePercent": 0,
                "custodyFeeEurPerYear": 0, "custodyFeePercentPerYear": 0, "durationYears": 20, **po, "advanceLumpSum": True}
        tax = {**TAX, **to}
        exp = {sc: adv_expected(plan, tax, sc, sy, sm) for sc in SCEN}
        (ADV_OUT / f"{name}.json").write_text(json.dumps(
            {"name": name, "description": desc, "synthetic": True, "plan": plan,
             "tax": {**tax, "advanceLumpSum": adv_params(sy, sm)}, "expected": exp}, indent=2) + "\n")
        adv_excel_sheet(wb, name, plan, tax, sy, sm, exp)
    for name, desc, po, ao, start, end, use_global, month in ADVP_CASES:
        plan = {**ETFP_PLAN, **po, "advanceLumpSum": True}; a = {**STAT_ASSUMPTIONS, **ao}
        exp = {sc: project_advance_payout(plan, ETFP_PROFILE, a, TAX, start, end, use_global, sc, 2026, month) for sc in SCEN}
        (ADVP_OUT / f"{name}.json").write_text(json.dumps(
            {"name": name, "description": desc, "synthetic": True, "plan": plan,
             "tax": {**TAX, "advanceLumpSum": adv_params(2026, month)}, "taxUnverified": True,
             "payoutStartAge": start, "payoutEndAge": end, "useGlobalAssumptions": use_global,
             "profile": ETFP_PROFILE, "assumptions": a, "currentYear": 2026, "currentMonth": month, "expected": exp}, indent=2) + "\n")
        advp_excel_sheet(wb, name, plan, ETFP_PROFILE, a, TAX, start, end, use_global, exp, 2026, month)
    WD_OUT.mkdir(exist_ok=True)
    for name, desc, po, ao, start, end, use_global, percent in WD_CASES:
        plan = {**ETFP_PLAN, "lumpSums": [], "annualContributionIncreasePercent": 0, "entryFeePercent": 0,
                "custodyFeeEurPerYear": 0, "custodyFeePercentPerYear": 0, **po}
        a = {**STAT_ASSUMPTIONS, **ao}
        exp = {sc: project_etf_withdrawal(plan, ETFP_PROFILE, a, TAX, start, end, use_global, percent, sc) for sc in SCEN}
        (WD_OUT / f"{name}.json").write_text(json.dumps(
            {"name": name, "description": desc, "synthetic": True, "plan": plan, "tax": TAX, "taxUnverified": True,
             "payoutStartAge": start, "payoutEndAge": end, "useGlobalAssumptions": use_global, "percent": percent,
             "profile": ETFP_PROFILE, "assumptions": a, "currentYear": 2026, "expected": exp}, indent=2) + "\n")
        wd_excel_sheet(wb, name, plan, ETFP_PROFILE, a, TAX, start, end, use_global, percent, exp["neutral"])
    wb.save(ROOT / "tools/golden-check.xlsx")
    print(f"wrote {len(CASES)} ETF, {len(GOAL_CASES)} goal and {len(TARGET_CASES)} ETF target and {len(STAT_CASES)} statutory and {len(DEPOT_CASES)} depot and {len(BAV_CASES)} occupational and {len(OV_CASES)} overview and {len(ETFP_CASES)} ETF payout and {len(HH_CASES)} household and {len(ADV_CASES)} advance and {len(ADVP_CASES)} advance payout vectors")


main()
