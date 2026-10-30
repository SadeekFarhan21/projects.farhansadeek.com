import { Suspense } from "react";
import NewFlightForm from "./NewFlightForm";

export const metadata = {
  title: "Create a new flight · SiloFlight",
};

export default function NewFlightPage() {
  return (
    <Suspense fallback={null}>
      <NewFlightForm />
    </Suspense>
  );
}
