import Image from "next/image";

// The original image is rendered directly so both halves of the emblem keep
// their intended colours. Decorative: the word beside it names the product.
export function Emblem({ className = "size-[22px]" }: { className?: string }) {
  return (
    <Image
      src="/images/logo-square.png"
      alt=""
      width={500}
      height={500}
      aria-hidden="true"
      data-slot="emblem"
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
