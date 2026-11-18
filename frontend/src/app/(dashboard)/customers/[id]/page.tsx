import type { Metadata } from "next";

import { Content } from "./Content";

export const metadata: Metadata = {
  title: "Müşteri Detayı",
};

// Müşteri ID'si Content içinde useParams ile okunur; veriler tarayıcıda
// oturum token'ı ile yüklendiği için sayfa sunucuda veri çekmez.
const CustomerDetailPage = () => {
  return <Content />;
};

export default CustomerDetailPage;
