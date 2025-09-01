import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

// If you want to ensure your content fits well on mobile and avoids overstretching,
// consider using responsive CSS styles in your components. For example:
//
// In your main CSS or styled-components:
//
// .container {
//   max-width: 100vw;
//   overflow-x: hidden;
//   box-sizing: border-box;
//   padding: 16px;
// }
//
// @media (max-width: 768px) {
//   .container {
//     padding: 8px;
//   }
//   form, input, button {
//     width: 100%;
//     box-sizing: border-box;
//   }
// }
//
// You can also use the `useIsMobile` hook to conditionally apply styles or render mobile-specific layouts.
//
// Example usage:
// 
// const isMobile = useIsMobile();
// return (
//   <div className={isMobile ? "container mobile" : "container"}>
//     {/* your content */}
//   </div>
// );
