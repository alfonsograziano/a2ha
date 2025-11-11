import { NextResponse } from "next/server";
import { getAllContactRequests } from "../../store";

export async function GET() {
  const requests = getAllContactRequests();
  // Serialize Date objects to ISO strings for JSON response
  const serializedRequests = requests.map((req) => ({
    ...req,
    timestamp: req.timestamp.toISOString(),
    sentMessageTimestamp: req.sentMessageTimestamp?.toISOString(),
  }));
  return NextResponse.json(serializedRequests);
}

