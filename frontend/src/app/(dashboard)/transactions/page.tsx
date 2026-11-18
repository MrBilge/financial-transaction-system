import type { Metadata } from "next";

import { PageBreadcrumb } from "@/components/PageBreadcrumb";

import { Content } from "./Content";

export const metadata: Metadata = {
  title: "İşlemler",
};

const TransactionsPage = () => {
  return (
    <>
      <PageBreadcrumb
        items={[{ label: "Genel Bakış", href: "/" }, { label: "İşlemler" }]}
      />
      <Content />
    </>
  );
};

export default TransactionsPage;
