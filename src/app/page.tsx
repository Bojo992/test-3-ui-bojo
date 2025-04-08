"use client";
import {useEffect, useState, useRef} from "react";
import {
    HttpTransportType,
    HubConnection,
    HubConnectionBuilder,
    LogLevel,
} from "@microsoft/signalr";

type Message = {
    sender: string;
    content: string;
    sentTime: Date;
    isMessageYours: boolean;
};

const Chat = () => {
    const connect = new HubConnectionBuilder()
        .withUrl("https://test-2-bojo-g8evbkdbgka2ezgp.northeurope-01.azurewebsites.net/hub", {
            skipNegotiation: true,
            transport: HttpTransportType.WebSockets  // force WebSocket transport
        })
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Information)
        .build();

    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [connection, setConnection] = useState<HubConnection>(connect);
    const chatContentBoxRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        connection
            .start()
            .then(async () => {
                connection.on("ReceiveMessage", (sender, content, sentTime, isYours) => {
                    setMessages((prev) => [...prev, {sender, content, sentTime, isMessageYours: isYours}]);
                });
                connection.on("MessageHistory", (sender) => {
                    setMessages(sender);
                });
                await connection.invoke("RetrieveMessageHistory");
            })
            .catch((err) =>
                console.error("Error while connecting to SignalR Hub:", err)
            );

        return () => {
            if (connection) {
                connection.off("ReceiveMessage");
            }
        };
    }, []);

    const sendMessage = async () => {
        if (connection && newMessage.trim()) {
            await connection.send("PostMessage", newMessage);
            setNewMessage("");
        }
    };

    const isMyMessage = (username: string) => {
        return username === connection!.connectionId;
    };

    // Scroll to the bottom when messages change
    useEffect(() => {
        const out = chatContentBoxRef.current;
        if (out) {
            out.scrollTop = out.scrollHeight;
        }
    }, [messages]); // Depend on messages, so it runs when a new message is added

    return (
        <div>
            <div className="relative h-16 flex items-center bg-blue-400">
                <div className="absolute left-1/2 transform -translate-x-1/2 text-3xl font-semibold">
                    Chat
                </div>
            </div>
            <div className="w-screen h-screen flex flex-col items-center justify-center">
                <div
                    className="mb-4 container max-h-2/3 overflow-auto overscroll-y-contain flex flex-col justify-center items-center"
                    id="chatContentBox"
                    ref={chatContentBoxRef}
                >
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`p-2 my-2 rounded text-black max-w-screen-md w-full overflow-x ${
                                msg.isMessageYours || isMyMessage(msg.sender) ? "bg-blue-500" : "bg-gray-200"
                            }`}
                        >
                            <p className="break-all text-left">{msg.content}</p>
                            <p className="text-xs text-right">
                                {new Date(msg.sentTime).toLocaleString()}
                            </p>
                        </div>
                    ))}
                </div>
                <div className="d-flex justify-row">
                    <input
                        type="text"
                        className="border p-2 mr-2 rounded w-[300px]"
                        value={newMessage}
                        maxLength={500}
                        onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <button
                        onClick={sendMessage}
                        className="bg-blue-500 text-white p-2 rounded"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Chat;
