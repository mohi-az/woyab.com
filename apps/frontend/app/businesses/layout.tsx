import Footer from "@/components/layout/Footer";

export default function BusinessesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Footer />
    </>
  );
}
