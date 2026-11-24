/** The Valiva mark next to the app name (sidebar and phone top bar). Decorative: the name stands next to it. */
export function Logo() {
  return (
    <img
      className="logo"
      src={`${import.meta.env.BASE_URL}favicon.svg`}
      alt=""
      width={28}
      height={28}
      draggable={false}
    />
  );
}
