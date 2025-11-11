import { NextRequest, NextResponse } from "next/server";
import { setSentMessage, getContactRequest } from "../../../../store";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> | { taskId: string } }
) {
  try {
    // Handle both promise and non-promise params (for Next.js 15+ and earlier versions)
    const resolvedParams = params instanceof Promise ? await params : params;
    const { taskId } = resolvedParams;
    
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid message field" },
        { status: 400 }
      );
    }

    // Check if contact request exists
    const contactRequest = getContactRequest(taskId);
    if (!contactRequest) {
      return NextResponse.json(
        { error: "Contact request not found" },
        { status: 404 }
      );
    }

    // Store the sent message
    setSentMessage(taskId, message);

    return NextResponse.json(
      { success: true, taskId },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error setting sent message:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}


