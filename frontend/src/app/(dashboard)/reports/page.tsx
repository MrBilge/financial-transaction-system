import type { Metadata } from "next";

import { PageBreadcrumb } from "@/components/PageBreadcrumb";

import { Content } from "./Content";

export const metadata: Metadata = {
  title: "Raporlar",
};

const ReportsPage = () => {
  return (
    <>
      <PageBreadcrumb
        items={[{ label: "Genel Bakış", href: "/" }, { label: "Raporlar" }]}
      />
      <Content />
    </>
  );
};

export default ReportsPage;
