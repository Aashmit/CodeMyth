'use client'; // Ensure this file is treated as a Client Component

import LoginButton from "./components/LoginButton";

export default function Home() {
    const handleLearnMore = () => {
        alert('Explore our features!');
    };

    return (
        <main className="flex flex-col items-center justify-center h-screen bg-gray-100 p-8 rounded-lg shadow-lg">
            <h1 className="text-4xl font-extrabold text-blue-600 mb-4">
                Welcome to DevDocs – Your Coding Companion
            </h1>
            <p className="text-lg text-gray-700 mb-6">
                Seamlessly generate documentation, explore code, and boost your development workflow.
            </p>
            <div className="flex justify-center space-x-4">
                <LoginButton />
            </div>
        </main>
    );
}
