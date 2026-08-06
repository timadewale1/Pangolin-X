import { redirect } from "next/navigation";

// Forecast advice is generated within the weather plan, so retain this URL
// for existing links but keep the farmer in one connected workflow.
export default function ForecastAdvisoryRedirect() {
  redirect("/dashboard/forecast");
}
