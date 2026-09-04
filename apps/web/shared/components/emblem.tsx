// The brand mark painted in the current text colour: the PNG is used as a
// CSS mask, which removes the periwinkle left in its pixels (DESIGN.md
// § 6 Navigation). Decorative: the word beside it names the product.
export function Emblem({ className = "size-[22px]" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-slot="emblem"
      className={`inline-block shrink-0 bg-current [mask-image:url(/images/logo-square.png)] [mask-position:center] [mask-repeat:no-repeat] [mask-size:contain] ${className}`}
    />
  );
}
