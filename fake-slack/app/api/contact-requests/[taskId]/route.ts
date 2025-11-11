import { NextRequest, NextResponse } from "next/server";
import { getContactRequest } from "../../../store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> | { taskId: string } }
) {
  // Handle both promise and non-promise params (for Next.js 15+ and earlier versions)
  const resolvedParams = params instanceof Promise ? await params : params;
  const { taskId } = resolvedParams;
  
  const contactRequest = getContactRequest(taskId);

  if (!contactRequest) {
    return NextResponse.json(
      { error: "Contact request not found" },
      { status: 404 }
    );
  }

  // Serialize the Date objects to ISO strings for JSON response
  return NextResponse.json({
    ...contactRequest,
    timestamp: contactRequest.timestamp.toISOString(),
    sentMessageTimestamp: contactRequest.sentMessageTimestamp?.toISOString(),
  });
}

