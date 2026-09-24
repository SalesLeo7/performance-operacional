from datetime import date, datetime, time
from copy import deepcopy
import unittest

from build_data import BusinessCalendar, OperationalConfiguration, classify_gross, classify_inbound, csv_timestamp, is_cancelled, split_capacity


class OutboundRulesTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = OperationalConfiguration()
        cls.config.gross_rules[("GWM", "PADRAO")] = [
            {"ruleId": "PADRAO", "start": "Allocated", "end": "Complete", "bandStartExclusive": None, "bandEndInclusive": time(14), "deadlineType": "Dia útil + hora", "businessDays": 0, "deadlineTime": time(17), "businessHours": None, "toleranceMinutes": 0, "from": date(2025, 1, 1), "to": date.max},
            {"ruleId": "PADRAO", "start": "Allocated", "end": "Complete", "bandStartExclusive": time(14), "bandEndInclusive": None, "deadlineType": "Dia útil + hora", "businessDays": 1, "deadlineTime": time(17), "businessHours": None, "toleranceMinutes": 0, "from": date(2025, 1, 1), "to": date.max},
        ]
        cls.calendar = BusinessCalendar(cls.config)

    def test_capacity_can_split_one_order(self):
        self.assertEqual(split_capacity(500, 400), (400, 100, 0))

    def test_cancelled_requires_a_valid_date(self):
        self.assertTrue(is_cancelled(datetime(2026, 7, 8, 15, 0)))
        self.assertTrue(is_cancelled("08/07/2026"))
        self.assertFalse(is_cancelled(None))
        self.assertFalse(is_cancelled("Cancelado sem data"))

    def test_release_during_lunch_moves_to_afternoon_shift(self):
        stamp = datetime(2026, 7, 8, 12, 30)
        self.assertEqual(self.calendar.normalize_release("GWM", stamp), datetime(2026, 7, 8, 13, 0))

    def test_holiday_is_removed_from_business_hours(self):
        start = datetime(2026, 7, 8, 11, 0)
        end = datetime(2026, 7, 10, 10, 0)
        self.assertEqual(self.calendar.business_hours("GWM", start, end), 7.0)

    def test_cutoff_at_exactly_14_is_in_d0_band(self):
        stamps = {"Allocated": datetime(2026, 7, 8, 14, 0), "Complete": datetime(2026, 7, 8, 17, 0)}
        result = classify_gross(self.config, self.calendar, "GWM", stamps, date(2026, 7, 8), datetime(2026, 7, 9, 8, 0))
        self.assertEqual(result["status"], "Completed On Time")
        self.assertEqual(result["dueAt"], "2026-07-08T17:00:00")

    def test_after_cutoff_uses_next_business_day(self):
        stamps = {"Allocated": datetime(2026, 7, 10, 14, 1), "Complete": datetime(2026, 7, 13, 17, 0)}
        result = classify_gross(self.config, self.calendar, "GWM", stamps, date(2026, 7, 10), datetime(2026, 7, 14, 8, 0))
        self.assertEqual(result["status"], "Completed On Time")
        self.assertEqual(result["dueAt"], "2026-07-13T17:00:00")

    def test_open_order_after_deadline_is_realized_delay(self):
        stamps = {"Allocated": datetime(2026, 7, 8, 10, 0), "Complete": None}
        result = classify_gross(self.config, self.calendar, "GWM", stamps, date(2026, 7, 8), datetime(2026, 7, 9, 8, 0))
        self.assertEqual(result["status"], "Open Delay")
        self.assertEqual(result["performance"], "Delay")

    def test_missing_end_with_later_stage_is_not_calculated(self):
        stamps = {"Allocated": datetime(2026, 7, 8, 10, 0), "Complete": None, "Shipped": datetime(2026, 7, 8, 16, 0)}
        result = classify_gross(self.config, self.calendar, "GWM", stamps, date(2026, 7, 8), datetime(2026, 7, 9, 8, 0))
        self.assertEqual(result["status"], "Not Calculated")

    def test_missing_configured_end_uses_nearest_previous_stage(self):
        config = deepcopy(self.config)
        for row in config.gross_rules[("GWM", "PADRAO")]:
            row["end"] = "Shipped"
        calendar = BusinessCalendar(config)
        stamps = {"Allocated": datetime(2026, 7, 8, 10, 0), "Complete": datetime(2026, 7, 8, 16, 0), "Shipped": None}
        result = classify_gross(config, calendar, "GWM", stamps, date(2026, 7, 8), datetime(2026, 7, 9, 8, 0))
        self.assertEqual(result["status"], "Completed On Time")
        self.assertTrue(result["fallbackApplied"])
        self.assertEqual(result["stageToUsed"], "Complete")

    def test_owner_aliases_separate_asus_divisions(self):
        self.assertEqual(self.config.owner_identity("ASUS", "ACBZECOM")["key"], "ECOMM")
        self.assertEqual(self.config.owner_identity("ASUS", "ACBZRETAIL")["key"], "RETAIL")

    def test_owner_inherits_client_default_rule(self):
        rows, error = self.config.effective_gross_rule("JETOUR", {"Allocated": datetime(2026, 7, 8, 10)}, date(2026, 7, 8), "PRINCIPAL")
        default_rows, default_error = self.config.effective_gross_rule("JETOUR", {"Allocated": datetime(2026, 7, 8, 10)}, date(2026, 7, 8), "DEFAULT")
        self.assertIsNone(error)
        self.assertIsNone(default_error)
        self.assertTrue(rows)
        self.assertEqual(rows, default_rows)

    def test_csv_timestamp_uses_declared_format(self):
        self.assertEqual(csv_timestamp("09-14-2026 13:45:02"), datetime(2026, 9, 14, 13, 45, 2))
        with self.assertRaises(ValueError):
            csv_timestamp("14/09/2026 13:45:02")

    def test_jac_source_and_owner_are_configured(self):
        self.assertEqual(self.config.outbound_sources["JAC"]["filename"], "outbound_consolidado.csv")
        self.assertEqual(self.config.outbound_sources["JAC"]["cutoff"], date(2026, 8, 19))
        self.assertEqual(self.config.owner_identity("JAC", "BRJAC")["key"], "PRINCIPAL")

    def test_outbound_consolidated_source_is_shared_by_all_configured_clients(self):
        self.assertEqual({item["filename"] for item in self.config.outbound_sources.values()}, {"outbound_consolidado.csv"})
        self.assertIn("AMZNLABS", self.config.outbound_sources)
        self.assertIn("SCANDERRA", self.config.outbound_sources)
        self.assertEqual(self.config.gross_rule_summary("AMZNLABS")["stageFrom"], "Allocated")
        self.assertEqual(self.config.capacity_profile("AMZNLABS", "DEFAULT")["suggestedCapacity"], 40)

    def test_inbound_uses_source_due_date(self):
        config = deepcopy(self.config)
        config.inbound_rules[("ASUS", "DEFAULT", "PADRAO")] = [{"ruleId": "PADRAO", "start": "Creation", "end": "Finish", "bandStartExclusive": None, "bandEndInclusive": None, "deadlineType": "Data de vencimento da fonte", "businessDays": None, "deadlineTime": None, "businessHours": None, "toleranceMinutes": 0, "from": date(2025, 1, 1), "to": date.max}]
        calendar = BusinessCalendar(config)
        stamps = {"Creation": datetime(2026, 7, 16, 8), "Finish": datetime(2026, 7, 16, 16)}
        result = classify_inbound(config, calendar, "ASUS", stamps, datetime(2026, 7, 16, 17), date(2026, 7, 16), datetime(2026, 7, 17, 8), "ECOMM")
        self.assertEqual(result["status"], "Completed On Time")
        self.assertEqual(result["dueAt"], "2026-07-16T17:00:00")

    def test_inbound_without_required_due_date_is_not_calculated(self):
        config = deepcopy(self.config)
        config.inbound_rules[("ASUS", "DEFAULT", "PADRAO")] = [{"ruleId": "PADRAO", "start": "Creation", "end": "Finish", "bandStartExclusive": None, "bandEndInclusive": None, "deadlineType": "Data de vencimento da fonte", "businessDays": None, "deadlineTime": None, "businessHours": None, "toleranceMinutes": 0, "from": date(2025, 1, 1), "to": date.max}]
        calendar = BusinessCalendar(config)
        stamps = {"Creation": datetime(2026, 7, 16, 8), "Finish": datetime(2026, 7, 16, 16)}
        result = classify_inbound(config, calendar, "ASUS", stamps, None, date(2026, 7, 16), datetime(2026, 7, 17, 8), "ECOMM")
        self.assertEqual(result["status"], "Not Calculated")
        self.assertEqual(result["reason"], "Due Date ausente")

    def test_inbound_capacity_is_separate_by_owner(self):
        ecomm = self.config.inbound_capacity_profile("ASUS", "ECOMM")
        retail = self.config.inbound_capacity_profile("ASUS", "RETAIL")
        self.assertEqual(ecomm["suggestedCapacity"], 102)
        self.assertEqual(retail["suggestedCapacity"], 30)
        self.assertFalse(ecomm["active"])
        self.assertEqual(ecomm["operation"], "Inbound")


if __name__ == "__main__":
    unittest.main()
