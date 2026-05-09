#!/usr/bin/env python3
"""
Analytics data generator for eCommerce Dashboard.
Reads Analysis/Query.xlsx and outputs aggregated JSON to data/analytics/.

Usage: python3 scripts/generate-analytics.py
"""

import pandas as pd
import json
import os
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
INPUT_FILE = BASE_DIR / "Analysis" / "Query.xlsx"
OUTPUT_DIR = BASE_DIR / "data" / "analytics"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

print("Reading Excel file...")
df = pd.read_excel(INPUT_FILE, sheet_name="eCommerce Query")
print(f"Loaded {len(df):,} rows")

# Normalize column names
df.columns = [
    "brn", "customer_name", "partner_id", "partner_name",
    "home_team", "commodity", "material_id", "material",
    "unit_cost", "year", "month", "qty", "amount"
]

# Drop rows with null amount or year
df = df.dropna(subset=["amount", "year", "month"])
df["year"] = df["year"].astype(int)
df["month"] = df["month"].astype(int)
df["brn"] = df["brn"].astype(str)
df["qty"] = df["qty"].fillna(0)
df["amount"] = df["amount"].fillna(0)

TEAMS = sorted(df["home_team"].dropna().unique().tolist())
YEARS = sorted(df["year"].unique().tolist())
BRNS = sorted(df["brn"].unique().tolist())

# ─────────────────────────────────────────────
# 1. summary.json — 전체 KPI + 팀별 KPI
# ─────────────────────────────────────────────
print("Generating summary.json...")

def make_summary(frame):
    return {
        "total_amount": round(float(frame["amount"].sum()), 0),
        "total_qty": round(float(frame["qty"].sum()), 2),
        "num_partners": int(frame["partner_name"].nunique()),
        "num_products": int(frame["material"].nunique()),
        "num_customers": int(frame["customer_name"].nunique()),
    }

summary = {
    "overall": make_summary(df),
    "by_team": {team: make_summary(df[df["home_team"] == team]) for team in TEAMS},
    "by_year": {
        str(year): make_summary(df[df["year"] == year]) for year in YEARS
    },
    "teams": TEAMS,
    "years": YEARS,
    "brns": BRNS,
}

with open(OUTPUT_DIR / "summary.json", "w", encoding="utf-8") as f:
    json.dump(summary, f, ensure_ascii=False, indent=2)
print("  → summary.json")

# ─────────────────────────────────────────────
# 2. monthly.json — year × month × home_team
# ─────────────────────────────────────────────
print("Generating monthly.json...")

monthly_group = (
    df.groupby(["year", "month", "home_team"])
    .agg(amount=("amount", "sum"), qty=("qty", "sum"))
    .reset_index()
)

monthly_records = []
for _, row in monthly_group.iterrows():
    monthly_records.append({
        "year": int(row["year"]),
        "month": int(row["month"]),
        "home_team": row["home_team"],
        "amount": round(float(row["amount"]), 0),
        "qty": round(float(row["qty"]), 2),
    })

with open(OUTPUT_DIR / "monthly.json", "w", encoding="utf-8") as f:
    json.dump(monthly_records, f, ensure_ascii=False, indent=2)
print(f"  → monthly.json ({len(monthly_records)} records)")

# ─────────────────────────────────────────────
# 3. products.json — material × home_team × year
# ─────────────────────────────────────────────
print("Generating products.json...")

product_group = (
    df.groupby(["material", "material_id", "home_team", "year"])
    .agg(amount=("amount", "sum"), qty=("qty", "sum"))
    .reset_index()
)

product_records = []
for _, row in product_group.iterrows():
    product_records.append({
        "material": row["material"],
        "material_id": row["material_id"],
        "home_team": row["home_team"],
        "year": int(row["year"]),
        "amount": round(float(row["amount"]), 0),
        "qty": round(float(row["qty"]), 2),
    })

with open(OUTPUT_DIR / "products.json", "w", encoding="utf-8") as f:
    json.dump(product_records, f, ensure_ascii=False, indent=2)
print(f"  → products.json ({len(product_records)} records)")

# ─────────────────────────────────────────────
# 4. partners.json — partner_name × home_team × year
# ─────────────────────────────────────────────
print("Generating partners.json...")

partner_group = (
    df.groupby(["partner_name", "home_team", "year"])
    .agg(amount=("amount", "sum"), qty=("qty", "sum"), num_products=("material", "nunique"))
    .reset_index()
)

partner_records = []
for _, row in partner_group.iterrows():
    partner_records.append({
        "partner_name": row["partner_name"],
        "home_team": row["home_team"],
        "year": int(row["year"]),
        "amount": round(float(row["amount"]), 0),
        "qty": round(float(row["qty"]), 2),
        "num_products": int(row["num_products"]),
    })

with open(OUTPUT_DIR / "partners.json", "w", encoding="utf-8") as f:
    json.dump(partner_records, f, ensure_ascii=False, indent=2)
print(f"  → partners.json ({len(partner_records)} records)")

# ─────────────────────────────────────────────
# 5. brn.json — brn × home_team × year × month
# ─────────────────────────────────────────────
print("Generating brn.json...")

brn_group = (
    df.groupby(["brn", "home_team", "year", "month"])
    .agg(amount=("amount", "sum"), qty=("qty", "sum"))
    .reset_index()
)

brn_records = []
for _, row in brn_group.iterrows():
    brn_records.append({
        "brn": str(row["brn"]),
        "home_team": row["home_team"],
        "year": int(row["year"]),
        "month": int(row["month"]),
        "amount": round(float(row["amount"]), 0),
        "qty": round(float(row["qty"]), 2),
    })

with open(OUTPUT_DIR / "brn.json", "w", encoding="utf-8") as f:
    json.dump(brn_records, f, ensure_ascii=False, indent=2)
print(f"  → brn.json ({len(brn_records)} records)")

# ─────────────────────────────────────────────
# 6. commodity.json — commodity × home_team × year
# ─────────────────────────────────────────────
print("Generating commodity.json...")

commodity_group = (
    df.groupby(["commodity", "home_team", "year"])
    .agg(amount=("amount", "sum"), qty=("qty", "sum"), num_products=("material", "nunique"))
    .reset_index()
)

commodity_records = []
for _, row in commodity_group.iterrows():
    commodity_records.append({
        "commodity": int(row["commodity"]),
        "home_team": row["home_team"],
        "year": int(row["year"]),
        "amount": round(float(row["amount"]), 0),
        "qty": round(float(row["qty"]), 2),
        "num_products": int(row["num_products"]),
    })

with open(OUTPUT_DIR / "commodity.json", "w", encoding="utf-8") as f:
    json.dump(commodity_records, f, ensure_ascii=False, indent=2)
print(f"  → commodity.json ({len(commodity_records)} records)")

print("\nDone! Files written to data/analytics/")
print(f"  summary.json, monthly.json, products.json, partners.json, brn.json, commodity.json")
