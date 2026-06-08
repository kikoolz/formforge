export default function FormForgeLogo({ size = 22 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center rounded-md bg-primary"
      >
        <svg
          width={size * 0.6}
          height={size * 0.6}
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect x="1" y="1" width="10" height="2" rx="1" fill="white" />
          <rect x="1" y="5" width="7" height="2" rx="1" fill="white" />
          <rect x="1" y="9" width="5" height="2" rx="1" fill="white" />
        </svg>
      </div>
      <span
        style={{ fontSize: size * 0.77 }}
        className="font-display font-semibold tracking-tight"
      >
        FormForge
      </span>
    </div>
  );
}
