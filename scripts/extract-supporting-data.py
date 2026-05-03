import json
import math
import re
import sys
from datetime import datetime

import pandas as pd


SOURCE = "/Users/naveengalla/Documents/Claude/Projects/Vaibhav/Supporting Docs/2 & 4 VEHICLES AGING UPTO NOV,2025.xlsx"


def clean(value):
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    if pd.isna(value):
        return None
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, str):
        value = re.sub(r"\s+", " ", value.replace("\n", " ")).strip()
        return value or None
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return value


def number(value):
    value = clean(value)
    if value is None:
        return None
    try:
        if isinstance(value, str):
            value = value.replace(",", "")
        return float(value)
    except Exception:
        return None


def integer(value):
    value = number(value)
    if value is None:
        return None
    return int(round(value))


def reg_no(value):
    value = clean(value)
    if not value:
        return None
    value = re.sub(r"[^A-Za-z0-9]", "", str(value)).upper()
    return value or None


def purpose_enum(value):
    text = (clean(value) or "").upper()
    if "CMD" in text:
        return "CMD_HOUSE"
    if "V SQUARE" in text or "VSQUARE" in text:
        return "V_SQUARE"
    if "MKT" in text or "MARKETING" in text:
        return "MARKETING_BRANDING"
    if "D2D" in text:
        return "D2D_BRANDING"
    if "BTL" in text or "EXH" in text or "BRANDING" in text or "BANK" in text or "CC" in text:
        return "BTL_BRANDING"
    if "MANAGEMENT" in text:
        return "MANAGEMENT"
    if "SRM" in text:
        return "SRM"
    if "ADMIN" in text:
        return "ADMIN"
    return "OTHER"


def vehicle_type(value, fallback):
    text = (clean(value) or fallback or "").upper()
    if "2" in text:
        return "TWO_WHEELER"
    if "4" in text:
        return "FOUR_WHEELER"
    return fallback


def infer_fuel_type(vehicle_no, fuel_lookup, vehicle_type_value):
    if vehicle_no in fuel_lookup:
        return fuel_lookup[vehicle_no]
    if vehicle_type_value == "TWO_WHEELER":
        return "PETROL"
    return "DIESEL"


def status_from_remarks(value):
    text = (clean(value) or "").upper()
    if "SOLD" in text and "CAN BE SOLD" not in text:
        return "SOLD"
    if "BREAK DOWN" in text or "BREAKDOWN" in text:
        return "IN_SERVICE"
    return "ACTIVE"


def make_model(value):
    text = clean(value)
    if not text:
        return (None, None)
    normalized = text.upper()
    if "ACTIVA" in normalized:
        return ("Honda", text)
    if "INNOVA" in normalized or "CRYSTA" in normalized:
        return ("Toyota", text)
    if "DZIRE" in normalized or "DEZIRE" in normalized:
        return ("Maruti Suzuki", text)
    if "XUV" in normalized or "BOLERO" in normalized:
        return ("Mahindra", text)
    if "EECO" in normalized:
        return ("Maruti Suzuki", text)
    if "TATA" in normalized or "MAGIC" in normalized:
        return ("Tata", text)
    if "BENZ" in normalized or "MERCEDES" in normalized:
        return ("Mercedes Benz", text)
    if "VOLVO" in normalized:
        return ("Volvo", text)
    if "KIA" in normalized:
        return ("Kia", text)
    if "VENUE" in normalized or "VERNA" in normalized:
        return ("Hyundai", text)
    if "TVS" in normalized:
        return ("TVS", text)
    return (text, text)


def read_fuel_rows():
    # The fuel sheet has headers in the first row.
    df = pd.read_excel(
        SOURCE,
        sheet_name="FUEL DATA APR - NOV-25",
        header=0,
        names=[
            "month",
            "vehicleName",
            "vehicleNumber",
            "fuelType",
            "quantityLitres",
            "totalAmount",
            "openingKm",
            "closingKm",
            "runningKm",
            "vehicleType",
            "location",
        ],
    )
    rows = []
    fuel_lookup = {}
    for _, row in df.iterrows():
        vehicle_no = reg_no(row.get("vehicleNumber"))
        if not vehicle_no:
            continue
        fuel_type = clean(row.get("fuelType"))
        fuel_type = "EV" if fuel_type == "ELECTRIC" else (fuel_type or "DIESEL")
        fuel_type = fuel_type.upper()
        if fuel_type not in {"PETROL", "DIESEL", "CNG", "EV", "HYBRID"}:
            fuel_type = "DIESEL"
        fuel_lookup.setdefault(vehicle_no, fuel_type)
        qty = number(row.get("quantityLitres"))
        total = number(row.get("totalAmount"))
        opening = integer(row.get("openingKm"))
        closing = integer(row.get("closingKm"))
        running = integer(row.get("runningKm"))
        month = clean(row.get("month"))
        rate = total / qty if qty and total else None
        rows.append(
            {
                "month": month,
                "vehicleNumber": vehicle_no,
                "vehicleName": clean(row.get("vehicleName")),
                "fuelType": fuel_type,
                "quantityLitres": qty,
                "totalAmount": total,
                "ratePerLitre": rate,
                "openingKm": opening,
                "closingKm": closing,
                "runningKm": running,
                "vehicleType": vehicle_type(row.get("vehicleType"), None),
                "location": clean(row.get("location")),
            }
        )
    return rows, fuel_lookup


def read_vehicle_sheet(sheet_name, fallback_type, fuel_lookup):
    df = pd.read_excel(SOURCE, sheet_name=sheet_name, header=1)
    vehicles = []
    for _, row in df.iterrows():
        vehicle_no = reg_no(row.get("VECHILE REG.NO"))
        if not vehicle_no:
            continue
        vtype = vehicle_type(row.get("VEHICLE TYPE"), fallback_type)
        raw_name = clean(row.get("VECHILE MAKE/MODEL"))
        make, model = make_model(raw_name)
        location = clean(row.get("LOCATION")) or "UNKNOWN"
        remarks = clean(row.get("REMARKS"))
        vehicles.append(
            {
                "vehicleNumber": vehicle_no,
                "vehicleName": raw_name,
                "make": make,
                "model": model,
                "vehicleType": vtype,
                "fuelType": infer_fuel_type(vehicle_no, fuel_lookup, vtype),
                "branchCode": location,
                "branchName": location,
                "purposeOfUsage": purpose_enum(row.get("PURPOSE OF USAGE")),
                "registrationDate": clean(row.get("DATE OF REGISTRATION")),
                "odometer": integer(row.get("RUNNING KM (30.11.2025)")),
                "fastagNumber": clean(row.get("FASTAG TOLL")),
                "remarks": remarks,
                "status": status_from_remarks(remarks),
                "avg2024Litres": number(row.get("2024 Ave Litters per Month")),
                "avg2024Km": number(row.get("2024 Ave Running KM per Month")),
                "avg2025Litres": number(row.get("2025 Ave Litters per Month")),
                "avg2025Km": number(row.get("2025 Ave Running KM per Month")),
            }
        )
    return vehicles


def main(output_path):
    fuel_rows, fuel_lookup = read_fuel_rows()
    vehicles = []
    vehicles.extend(read_vehicle_sheet("4 W", "FOUR_WHEELER", fuel_lookup))
    vehicles.extend(read_vehicle_sheet("2 W", "TWO_WHEELER", fuel_lookup))

    known = {v["vehicleNumber"] for v in vehicles}
    for row in fuel_rows:
        if row["vehicleNumber"] in known:
            continue
        vtype = row["vehicleType"] or "FOUR_WHEELER"
        make, model = make_model(row["vehicleName"])
        location = row["location"] or "UNKNOWN"
        vehicles.append(
            {
                "vehicleNumber": row["vehicleNumber"],
                "vehicleName": row["vehicleName"],
                "make": make,
                "model": model,
                "vehicleType": vtype,
                "fuelType": row["fuelType"],
                "branchCode": location,
                "branchName": location,
                "purposeOfUsage": "OTHER",
                "registrationDate": None,
                "odometer": row["closingKm"],
                "fastagNumber": None,
                "remarks": "Created from fuel data sheet; not present in current vehicle master tabs.",
                "status": "ACTIVE",
                "avg2024Litres": None,
                "avg2024Km": None,
                "avg2025Litres": None,
                "avg2025Km": None,
            }
        )

    payload = {"vehicles": vehicles, "fuelEntries": fuel_rows}
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(json.dumps({"vehicles": len(vehicles), "fuelEntries": len(fuel_rows)}, indent=2))


if __name__ == "__main__":
    main(sys.argv[1])
