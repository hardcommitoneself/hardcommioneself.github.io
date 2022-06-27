import * as React from "react";

import Header from "./Header";

export default function Layout(props) {
  return (
    <>
      <Header />
      {props.children}
    </>
  );
}
