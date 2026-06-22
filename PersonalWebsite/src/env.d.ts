/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    session?: { login: string; token: string };
  }
}
