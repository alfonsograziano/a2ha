import { NextRequest, NextResponse } from "next/server";
import { addContactRequest, ContactRequest } from "../../store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { from, to, message, taskId } = body;

    if (!from || !to || !message || !taskId) {
      return NextResponse.json(
        { error: "Missing required fields: from, to, message, taskId" },
        { status: 400 }
      );
    }

    const contactRequest: ContactRequest = {
      from,
      to,
      message,
      taskId,
      timestamp: new Date(),
    };

    addContactRequest(contactRequest);

    return NextResponse.json(
      { success: true, taskId },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

