import LoginButton from "./components/LoginButton";

export default function Home() {
    return (
        <main className="flex flex-col items-center justify-center h-screen">
            <h1 className="text-2xl font-bold">Welcome to My App</h1>
            <LoginButton />
        </main>
    );
}
