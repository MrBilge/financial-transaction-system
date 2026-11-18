import type { Metadata } from "next";

import { PageBreadcrumb } from "@/components/PageBreadcrumb";

import { Content } from "./Content";

export const metadata: Metadata = {
  title: "Müşteri Detayı",
};

// Müşteri ID'si Content içinde useParams ile okunur; veriler tarayıcıda
// oturum token'ı ile yüklendiği için sayfa sunucuda veri çekmez.
const CustomerDetailPage = () => {
  return (
    <>
      <PageBreadcrumb
        items={[
          { label: "Genel Bakış", href: "/" },
          { label: "Müşteriler", href: "/customers" },
          { label: "Müşteri Detayı" },
        ]}
      />
      <Content />
    </>
  );
};

export default CustomerDetailPage;
