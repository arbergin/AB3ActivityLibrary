"use client";

import { useState } from "react";
import {
  categoryOptions,
  fieldLocationOptions,
  gamePhaseOptions,
} from "@/lib/activityOptions";

export default function SettingsPanel() {
  const [selectedDropdown, setSelectedDropdown] = useState("Category");

  const dropdownValues =
    selectedDropdown === "Field Location"
      ? fieldLocationOptions
      : selectedDropdown === "Game Phase"
        ? gamePhaseOptions
        : categoryOptions;

  return (
    <div className="grid gap-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">User Management</h2>
          <p className="mt-2 text-sm text-slate-600">
            Admins can add/remove users, reset passwords, send invites, and
            assign roles.
          </p>

          <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
            <div className="grid grid-cols-5 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
              <div>Name</div>
              <div>Email</div>
              <div>Role</div>
              <div>Status</div>
              <div>Actions</div>
            </div>

            <div className="grid grid-cols-5 px-4 py-4 text-sm text-slate-600">
              <div>Coach User</div>
              <div>coach@email.com</div>
              <div>User</div>
              <div>Active</div>
              <div className="flex gap-3">
                <button className="font-semibold text-slate-700">
                  Reset
                </button>
                <button className="font-semibold text-slate-700">
                  Remove
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Create User / Onboard User</h2>
          <p className="mt-2 text-sm text-slate-600">
            Admin can create a user with a temporary password or send an invite
            email so the user creates their own password.
          </p>

          <form className="mt-6 grid gap-4">
            <label className="grid gap-1">
              <span className="text-sm font-semibold">Name</span>
              <input
                type="text"
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Free text"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold">Email</span>
              <input
                type="email"
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="name@email.com"
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold">Role</span>
              <select className="rounded-lg border border-slate-300 px-3 py-2">
                <option>User</option>
                <option>Admin</option>
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-sm font-semibold">Temporary Password</span>
              <input
                type="text"
                className="rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Auto-generate or enter"
              />
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" defaultChecked />
              Require password reset on first login
            </label>

            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              Recommended: use Send Invite so the admin never handles the
              user&apos;s real password.
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700"
              >
                Create User
              </button>

              <button
                type="button"
                className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
              >
                Send Invite
              </button>
            </div>
          </form>
        </section>
      </div>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold">Dropdown Value Management</h2>
        <p className="mt-2 text-sm text-slate-600">
          Admins can manage values used in activity forms and search filters.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          {["Field Location", "Game Phase", "Category"].map((dropdown) => (
            <button
              key={dropdown}
              type="button"
              onClick={() => setSelectedDropdown(dropdown)}
              className={`rounded-lg px-4 py-2 font-semibold ${
                selectedDropdown === dropdown
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 text-slate-700"
              }`}
            >
              {dropdown}
            </button>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
          <div className="grid grid-cols-[1fr_auto] bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
            <div>{selectedDropdown} Values</div>
            <div>Actions</div>
          </div>

          {dropdownValues.map((value) => (
            <div
              key={value}
              className="grid grid-cols-[1fr_auto] border-t border-slate-200 px-4 py-4 text-sm text-slate-600"
            >
              <div>{value}</div>
              <div className="flex gap-4">
                <button className="font-semibold text-slate-700">Edit</button>
                <button className="font-semibold text-slate-700">Del</button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end">
          <button className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white">
            Add Value
          </button>
        </div>
      </section>
    </div>
  );
}