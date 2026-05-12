import * as React from "react";
import * as ReactDOM from "react-dom/client";

globalThis.React = React;
globalThis.ReactDOM = ReactDOM;

const {
  useState, useEffect, useRef, useCallback, useMemo,
  useContext, useReducer, useLayoutEffect,
  createContext, createElement, forwardRef, memo,
  Fragment, Children, cloneElement, isValidElement,
} = React;

Object.assign(globalThis, {
  useState, useEffect, useRef, useCallback, useMemo,
  useContext, useReducer, useLayoutEffect,
  createContext, createElement, forwardRef, memo,
  Fragment, Children, cloneElement, isValidElement,
});
