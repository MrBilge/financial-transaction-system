import type { Metadata } from "next";

import { PageBreadcrumb } from "@/components/PageBreadcrumb";

import { Content } from "./Content";

export const metadata: Metadata = {
  title: "Müşteriler",
};

const CustomersPage = () => {
  return (
    <>
      <PageBreadcrumb
        items={[{ label: "Genel Bakış", href: "/" }, { label: "Müşteriler" }]}
      />
      <Content />
    </>
  );
};

export default CustomersPage;
