import { createFileRoute } from "@tanstack/react-router";
import { InformationBankPage } from "@/features/copilot/bank-page";

export const Route = createFileRoute("/dashboard/information-bank")({ component: InformationBankPage });
