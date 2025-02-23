import dynamic from "next/dynamic";

const Callback = dynamic(() => import("./Callback"), {
  ssr: false,
});

export default function Page() {
  return <Callback />;
}
