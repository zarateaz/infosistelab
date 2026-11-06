"use client";

import dynamic from "next/dynamic";

// The AI SDK's chat UI is only needed once someone actually opens the
// widget — loading it on every route (including ones that never touch
// chat) would cost bundle weight for nothing. layout.tsx is a Server
// Component and can't use `ssr: false` directly, hence this wrapper.
const ChatBot = dynamic(() => import("@/components/ChatBot").then((m) => m.ChatBot), {
  ssr: false,
});

export default ChatBot;
