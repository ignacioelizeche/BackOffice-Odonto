"use client"

import { PatientsStats } from "./patients-stats"
import { PatientsTable } from "./patients-table"

export function PatientsContent() {
  return (
    <>
      <PatientsStats />
      <PatientsTable />
    </>
  )
}
