import { Building2, Hospital, Plus, Trash2, Users } from "lucide-react";

import { ActionButton } from "@/components/action-button";
import { SortableTable } from "@/components/sortable-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ROLE_LABELS, requireAdminSession } from "@/lib/auth";
import { formatCurrency } from "@/lib/calc";
import { listCompanies, listHospitals, listUsers } from "@/lib/data";
import {
  deleteCompany,
  deleteHospital,
  deleteUser,
  toggleCompany,
  toggleHospital,
  toggleUser,
} from "@/app/(app)/configuracion/actions";
import { CompanyDialog } from "@/app/(app)/configuracion/company-dialog";
import { HospitalDialog } from "@/app/(app)/configuracion/hospital-dialog";
import { UserDialog } from "@/app/(app)/configuracion/user-dialog";

export const dynamic = "force-dynamic";

const PERIOD_LABELS = {
  weekly: "Semanal",
  biweekly: "Quincenal",
} as const;

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "secondary" : "outline"}>
      {active ? "Activo" : "Inactivo"}
    </Badge>
  );
}

export default async function ConfiguracionPage() {
  const session = await requireAdminSession();

  const [companies, hospitals, users] = await Promise.all([
    listCompanies(),
    listHospitals(),
    listUsers(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">
          Empresas, hospitales con su precio vigente y usuarios del sistema. Usa los
          títulos de cada columna para ordenar de forma ascendente o descendente.
        </p>
      </div>

      <Tabs defaultValue="empresas">
        <TabsList>
          <TabsTrigger value="empresas">
            <Building2 className="size-4" />
            Empresas
          </TabsTrigger>
          <TabsTrigger value="hospitales">
            <Hospital className="size-4" />
            Hospitales
          </TabsTrigger>
          <TabsTrigger value="usuarios">
            <Users className="size-4" />
            Usuarios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresas">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Empresas</CardTitle>
                <CardDescription>
                  La periodicidad define el periodo de los reportes por empresa.
                </CardDescription>
              </div>
              <CompanyDialog
                trigger={
                  <Button size="sm">
                    <Plus className="size-4" />
                    Nueva empresa
                  </Button>
                }
              />
            </CardHeader>
            <CardContent>
              <SortableTable
                defaultSortKey="name"
                emptyMessage="Todavía no hay empresas registradas."
                columns={[
                  { key: "name", label: "Empresa" },
                  { key: "period", label: "Periodicidad" },
                  { key: "snack", label: "Colación" },
                  { key: "hospitals", label: "Hospitales" },
                  { key: "active", label: "Estado" },
                  { key: "actions", label: "Acciones", alignRight: true, sortable: false },
                ]}
                rows={companies.map((company) => {
                  const hospitalCount = hospitals.filter(
                    (item) => item.companyId === company.id,
                  ).length;

                  return {
                    id: company.id,
                    values: {
                      name: company.name,
                      period: PERIOD_LABELS[company.paymentPeriodType],
                      snack: company.usesSnack ? "Sí" : "No",
                      hospitals: hospitalCount,
                      active: company.active,
                    },
                    cells: (
                      <>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell>{PERIOD_LABELS[company.paymentPeriodType]}</TableCell>
                        <TableCell>{company.usesSnack ? "Sí" : "No"}</TableCell>
                        <TableCell>{hospitalCount}</TableCell>
                        <TableCell>
                          <ActiveBadge active={company.active} />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <CompanyDialog
                              company={company}
                              trigger={
                                <Button variant="outline" size="sm">
                                  Editar
                                </Button>
                              }
                            />
                            <ActionButton
                              action={toggleCompany}
                              values={{ id: company.id }}
                            >
                              {company.active ? "Desactivar" : "Activar"}
                            </ActionButton>
                            <ActionButton
                              action={deleteCompany}
                              values={{ id: company.id }}
                              className="text-destructive hover:text-destructive"
                              confirmTitle={`¿Eliminar ${company.name}?`}
                              confirmDescription="La empresa se borra definitivamente. Solo es posible si ya no tiene hospitales registrados."
                              confirmLabel="Eliminar"
                            >
                              <Trash2 className="size-4" />
                              Eliminar
                            </ActionButton>
                          </div>
                        </TableCell>
                      </>
                    ),
                  };
                })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hospitales">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Hospitales</CardTitle>
                <CardDescription>
                  Cada hospital pertenece a una empresa, está en un estado de la
                  República y tiene su propio precio.
                </CardDescription>
              </div>
              <HospitalDialog
                companies={companies}
                trigger={
                  <Button size="sm" disabled={companies.length === 0}>
                    <Plus className="size-4" />
                    Nuevo hospital
                  </Button>
                }
              />
            </CardHeader>
            <CardContent>
              <SortableTable
                defaultSortKey="name"
                emptyMessage="Todavía no hay hospitales registrados."
                columns={[
                  { key: "name", label: "Hospital" },
                  { key: "company", label: "Empresa" },
                  { key: "state", label: "Estado" },
                  { key: "price", label: "Precio actual", alignRight: true },
                  { key: "active", label: "Situación" },
                  { key: "actions", label: "Acciones", alignRight: true, sortable: false },
                ]}
                rows={hospitals.map((hospital) => ({
                  id: hospital.id,
                  values: {
                    name: hospital.name,
                    company: hospital.companyName,
                    state: hospital.state,
                    price: hospital.price,
                    active: hospital.active,
                  },
                  cells: (
                    <>
                      <TableCell className="font-medium">{hospital.name}</TableCell>
                      <TableCell>{hospital.companyName}</TableCell>
                      <TableCell>{hospital.state}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(hospital.price)}
                      </TableCell>
                      <TableCell>
                        <ActiveBadge active={hospital.active} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <HospitalDialog
                            hospital={hospital}
                            companies={companies}
                            trigger={
                              <Button variant="outline" size="sm">
                                Editar
                              </Button>
                            }
                          />
                          <ActionButton
                            action={toggleHospital}
                            values={{ id: hospital.id }}
                          >
                            {hospital.active ? "Desactivar" : "Activar"}
                          </ActionButton>
                          <ActionButton
                            action={deleteHospital}
                            values={{ id: hospital.id }}
                            className="text-destructive hover:text-destructive"
                            confirmTitle={`¿Eliminar ${hospital.name}?`}
                            confirmDescription={
                              hospital.recordCount > 0
                                ? `El hospital se borra definitivamente junto con sus ${hospital.recordCount} capturas y sus fotos, y dejará de aparecer en los reportes. Si solo quieres dejar de usarlo, desactívalo.`
                                : "El hospital se borra definitivamente. Si solo quieres dejar de usarlo, desactívalo."
                            }
                            confirmLabel="Eliminar"
                          >
                            <Trash2 className="size-4" />
                            Eliminar
                          </ActionButton>
                        </div>
                      </TableCell>
                    </>
                  ),
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Usuarios</CardTitle>
                <CardDescription>
                  Los capturistas solo ven Inicio, Captura y No completados; reportes y
                  configuración son de administradores.
                </CardDescription>
              </div>
              <UserDialog
                trigger={
                  <Button size="sm">
                    <Plus className="size-4" />
                    Nuevo usuario
                  </Button>
                }
              />
            </CardHeader>
            <CardContent>
              <SortableTable
                defaultSortKey="name"
                emptyMessage="Todavía no hay usuarios registrados."
                columns={[
                  { key: "name", label: "Nombre" },
                  { key: "username", label: "Usuario" },
                  { key: "role", label: "Rol" },
                  { key: "active", label: "Estado" },
                  { key: "actions", label: "Acciones", alignRight: true, sortable: false },
                ]}
                rows={users.map((user) => ({
                  id: user.id,
                  values: {
                    name: user.name,
                    username: user.username,
                    role: ROLE_LABELS[user.role],
                    active: user.active,
                  },
                  cells: (
                    <>
                      <TableCell className="font-medium">
                        {user.name}
                        {user.id === session.id ? (
                          <span className="ml-2 text-xs text-muted-foreground">(tú)</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.username}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === "admin" ? "default" : "outline"}>
                          {ROLE_LABELS[user.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ActiveBadge active={user.active} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <UserDialog
                            user={user}
                            trigger={
                              <Button variant="outline" size="sm">
                                Editar
                              </Button>
                            }
                          />
                          <ActionButton
                            action={toggleUser}
                            values={{ id: user.id }}
                            disabled={user.id === session.id}
                          >
                            {user.active ? "Desactivar" : "Activar"}
                          </ActionButton>
                          <ActionButton
                            action={deleteUser}
                            values={{ id: user.id }}
                            disabled={user.id === session.id}
                            className="text-destructive hover:text-destructive"
                            confirmTitle={`¿Eliminar a ${user.name}?`}
                            confirmDescription="El usuario se borra definitivamente y perderá el acceso al sistema."
                            confirmLabel="Eliminar"
                          >
                            <Trash2 className="size-4" />
                            Eliminar
                          </ActionButton>
                        </div>
                      </TableCell>
                    </>
                  ),
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
