import type { Metadata } from "next";

import { PageBreadcrumb } from "@/components/PageBreadcrumb";

import { Content } from "./Content";

export const metadata: Metadata = {
  title: "Genel Bakış",
};

const DashboardPage = () => {
  return (
    <>
      <PageBreadcrumb items={[{ label: "Genel Bakış" }]} />
      <Content />
    </>
  );
};

export default DashboardPage;
