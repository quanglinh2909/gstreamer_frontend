import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import { MainLayout } from "../components/layouts/main-layout";


export default function Home() {
    return (
        <MainLayout>
            <div
                className={`flex min-h-screen flex-col items-center justify-between p-24`}
            >
                <h1 className="text-4xl font-bold">Hello, World!</h1>
            </div>
        </MainLayout>
    );
}
