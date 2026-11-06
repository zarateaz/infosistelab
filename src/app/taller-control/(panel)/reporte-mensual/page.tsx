import { getMonthlySalesReport } from "./actions";
import { MonthlyReportClient } from "./MonthlyReportClient";

export default async function MonthlyReportPage() {
  const initialData = await getMonthlySalesReport();
  return <MonthlyReportClient initialData={initialData} />;
}
