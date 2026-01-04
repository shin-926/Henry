# Henry API Reference

> 生成日時: 2026/1/4 15:31:45
> 収集済み API: 155 件

## 目次 (Table of Contents)

- [AccountingSetFolders](#accountingsetfolders)
- [AccountingSets](#accountingsets)
- [AuthenticateToken](#authenticatetoken)
- [ChannelTalkMemberHash](#channeltalkmemberhash)
- [ChargeItemDefinitions](#chargeitemdefinitions)
- [ClinicalCalendarView](#clinicalcalendarview)
- [CreateClinicalDocument](#createclinicaldocument)
- [CreateImagingOrder](#createimagingorder)
- [CreateImagingOrderOrderStatusAction](#createimagingorderorderstatusaction)
- [CreateInjectionOrder](#createinjectionorder)
- [CreateInjectionOrderOrderStatusAction](#createinjectionorderorderstatusaction)
- [CreatePatient](#createpatient)
- [CreatePatientFile](#createpatientfile)
- [CreatePatientFileFromPatientDocumentTemplate](#createpatientfilefrompatientdocumenttemplate)
- [CreatePrescriptionOrderOrderStatusAction](#createprescriptionorderorderstatusaction)
- [CreateRehabilitationOrder](#createrehabilitationorder)
- [CreateRehabilitationOrderOrderStatusAction](#createrehabilitationorderorderstatusaction)
- [CreateSession](#createsession)
- [DefaultExtendedInsuranceCombination](#defaultextendedinsurancecombination)
- [DeletePatientFile](#deletepatientfile)
- [EncounterByOutpatientAccounting](#encounterbyoutpatientaccounting)
- [EncountersInPatient](#encountersinpatient)
- [EncounterTemplateFoldersQuery](#encountertemplatefoldersquery)
- [EncounterTemplatesQuery](#encountertemplatesquery)
- [GetAccountingOrder](#getaccountingorder)
- [GetBiopsyInspectionOrder](#getbiopsyinspectionorder)
- [GetCalculationHistory](#getcalculationhistory)
- [GetClinicalCalendarView](#getclinicalcalendarview)
- [GetClinicalDocument](#getclinicaldocument)
- [GetFileUploadUrl](#getfileuploadurl)
- [GetFoodSupplyConfig](#getfoodsupplyconfig)
- [GetImagingOrder](#getimagingorder)
- [GetInjectionOrder](#getinjectionorder)
- [GetNutritionOrder](#getnutritionorder)
- [GetOrderNotifiableViewAction](#getordernotifiableviewaction)
- [GetOrganization](#getorganization)
- [getOrganizationFeatureFlag](#getorganizationfeatureflag)
- [GetOrganizationMembershipWithDetail](#getorganizationmembershipwithdetail)
- [GetOutpatientAccountingBilling](#getoutpatientaccountingbilling)
- [GetPatient](#getpatient)
- [GetPatientDocumentTemplate](#getpatientdocumenttemplate)
- [GetPrescriptionOrder](#getprescriptionorder)
- [GetRehabilitationOrder](#getrehabilitationorder)
- [GetSession](#getsession)
- [GetSpecimenInspectionOrder](#getspecimeninspectionorder)
- [InjectionOrder](#injectionorder)
- [injectionOrderHistories](#injectionorderhistories)
- [latestApprovedInjectionOrderHistoriesExcludingCurrent](#latestapprovedinjectionorderhistoriesexcludingcurrent)
- [ListActiveNursingPlans](#listactivenursingplans)
- [ListAllPatientAttentions](#listallpatientattentions)
- [ListAllPatientAttentionsV2](#listallpatientattentionsv2)
- [ListAllRehabilitationCalculationTypes](#listallrehabilitationcalculationtypes)
- [ListAvailableMhlwDefinitions](#listavailablemhlwdefinitions)
- [ListAvailablePatientInsuranceCombinations](#listavailablepatientinsurancecombinations)
- [ListBiopsyInspectionOrderHistories](#listbiopsyinspectionorderhistories)
- [ListBiopsyInspections](#listbiopsyinspections)
- [ListClinicalDocumentCustomTypes](#listclinicaldocumentcustomtypes)
- [ListClinicalDocuments](#listclinicaldocuments)
- [ListClinicalQuantitativeDataDefs](#listclinicalquantitativedatadefs)
- [ListComments](#listcomments)
- [ListDailyWardHospitalizations](#listdailywardhospitalizations)
- [ListDepartments](#listdepartments)
- [ListDiagnoses](#listdiagnoses)
- [ListDietaryRegimens](#listdietaryregimens)
- [ListEndedNursingPlans](#listendednursingplans)
- [ListFeatureFlags](#listfeatureflags)
- [ListFf1RecordSlots](#listff1recordslots)
- [ListFood](#listfood)
- [ListHospitalizationAccountingSummaries](#listhospitalizationaccountingsummaries)
- [ListHospitalizationDepartments](#listhospitalizationdepartments)
- [ListHospitalizationDoctors](#listhospitalizationdoctors)
- [ListHospitalizationLocations](#listhospitalizationlocations)
- [ListImagingOrderHistories](#listimagingorderhistories)
- [ListLastApprovedPrescriptionOrderHistories](#listlastapprovedprescriptionorderhistories)
- [ListLatestFinalizedBiopsyInspectionOrderHistories](#listlatestfinalizedbiopsyinspectionorderhistories)
- [ListLatestFinalizedImagingOrderHistories](#listlatestfinalizedimagingorderhistories)
- [ListLatestFinalizedSpecimenInspectionOrderHistories](#listlatestfinalizedspecimeninspectionorderhistories)
- [ListLaunchIntegrations](#listlaunchintegrations)
- [ListLocalMedicines](#listlocalmedicines)
- [ListMonthlyReceiptStates](#listmonthlyreceiptstates)
- [ListNonEmptyPatientFileFoldersOfPatient](#listnonemptypatientfilefoldersofpatient)
- [ListNonHealthcareSystemActions](#listnonhealthcaresystemactions)
- [ListNotifiableOrders](#listnotifiableorders)
- [ListNursingJournalEditorTemplates](#listnursingjournaleditortemplates)
- [ListNursingJournals](#listnursingjournals)
- [ListOrders](#listorders)
- [ListOrganizationClinicalRecordViewFilters](#listorganizationclinicalrecordviewfilters)
- [ListOrganizationImagingModalities](#listorganizationimagingmodalities)
- [ListOrganizationInstitutionStandards](#listorganizationinstitutionstandards)
- [ListOrganizationMemberships](#listorganizationmemberships)
- [ListOutpatientAccountingForNavigation](#listoutpatientaccountingfornavigation)
- [ListOutpatientAccountingWithBilling](#listoutpatientaccountingwithbilling)
- [ListPatientCeilingAmountApplications](#listpatientceilingamountapplications)
- [ListPatientContacts](#listpatientcontacts)
- [ListPatientDocumentTemplates](#listpatientdocumenttemplates)
- [ListPatientFileFolders](#listpatientfilefolders)
- [ListPatientFiles](#listpatientfiles)
- [ListPatientHealthcareFeeExemptionCertificates](#listpatienthealthcarefeeexemptioncertificates)
- [ListPatientHealthInsurances](#listpatienthealthinsurances)
- [ListPatientHospitalizations](#listpatienthospitalizations)
- [ListPatientLongTermCareInsurances](#listpatientlongtermcareinsurances)
- [ListPatientPublicSubsidies](#listpatientpublicsubsidies)
- [ListPatientQualifications](#listpatientqualifications)
- [ListPatientReceiptDiseases](#listpatientreceiptdiseases)
- [ListPatientReceiptTokkijiko](#listpatientreceipttokkijiko)
- [ListPatientSessionInvoices](#listpatientsessioninvoices)
- [ListPatientSessions](#listpatientsessions)
- [ListPatientSessionsForConfirmSimilarSessions](#listpatientsessionsforconfirmsimilarsessions)
- [ListPatientSummaries](#listpatientsummaries)
- [ListPatientsV2](#listpatientsv2)
- [ListPatientTokuteiSippeiRyouyouJuryoushous](#listpatienttokuteisippeiryouyoujuryoushous)
- [ListPrescriptionOrderHistories](#listprescriptionorderhistories)
- [ListPurposeOfVisits](#listpurposeofvisits)
- [ListReceiptRemarksColumns](#listreceiptremarkscolumns)
- [ListRehabilitationDocuments](#listrehabilitationdocuments)
- [ListRehabilitationDocumentTemplates](#listrehabilitationdocumenttemplates)
- [ListRehabilitationPlans](#listrehabilitationplans)
- [ListResubmittableReceipts](#listresubmittablereceipts)
- [ListRoomNonHealthcareSystemCharges](#listroomnonhealthcaresystemcharges)
- [ListRoomsInAllWards](#listroomsinallwards)
- [ListScheduledOrders](#listscheduledorders)
- [ListScheduledToEntryHospitalizations](#listscheduledtoentryhospitalizations)
- [ListScheduledToLeaveHospitalizations](#listscheduledtoleavehospitalizations)
- [ListSectionedOrdersInPatient](#listsectionedordersinpatient)
- [ListSectionedScheduledOrdersInPatient](#listsectionedscheduledordersinpatient)
- [ListSessions](#listsessions)
- [ListSimilarPatients](#listsimilarpatients)
- [ListSpecimenInspectionOrderHistories](#listspecimeninspectionorderhistories)
- [ListSpecimenInspections](#listspecimeninspections)
- [ListSurgeryDocuments](#listsurgerydocuments)
- [ListSurgeryDocumentTemplates](#listsurgerydocumenttemplates)
- [ListSymptomDescriptions](#listsymptomdescriptions)
- [ListUnscheduledRoomsHospitalizations](#listunscheduledroomshospitalizations)
- [ListUserClinicalRecordViewFilters](#listuserclinicalrecordviewfilters)
- [ListUsers](#listusers)
- [ListWardOccupancy](#listwardoccupancy)
- [ListWards](#listwards)
- [LockOAEditor](#lockoaeditor)
- [NursingPlanTemplates](#nursingplantemplates)
- [OutpatientAccountingCost](#outpatientaccountingcost)
- [OutpatientAccountingEncounters](#outpatientaccountingencounters)
- [OutpatientAccountingPatientBurdenValidationReports](#outpatientaccountingpatientburdenvalidationreports)
- [OutpatientAccountingUnSyncedEncounterCounts](#outpatientaccountingunsyncedencountercounts)
- [OutpatientProblemReport](#outpatientproblemreport)
- [RecordAnalyticalEvent](#recordanalyticalevent)
- [SearchAccountingOrderTemplates](#searchaccountingordertemplates)
- [SearchImagingOrderTemplates](#searchimagingordertemplates)
- [SearchInjectionOrderTemplates](#searchinjectionordertemplates)
- [SearchInjectionTechniques](#searchinjectiontechniques)
- [SearchMedicinesV2](#searchmedicinesv2)
- [SearchMhlwEquipments](#searchmhlwequipments)
- [SearchPrescriptionOrderTemplates](#searchprescriptionordertemplates)
- [UpdateClinicalDocument](#updateclinicaldocument)
- [UpdateOrderNotifiableViewAction](#updateordernotifiableviewaction)
- [UpdatePatientFile](#updatepatientfile)

---

## AccountingSetFolders

**Hash**: `25c2074604c22db2de611f6a5ec9e3d2aa1895bd9691a0056edfacda1db28d97`

### Variables

```json
{
  "input": {
    "patientId": "null",
    "parentFolderId": "null",
    "patientIdFilterMode": "string",
    "parentFolderFilterMode": "string",
    "searchDate": "string",
    "query": "string",
    "pageSize": "number",
    "pageToken": "null"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "accountingSetFolders": {
          "type": "object",
          "properties": {
            "accountingSetFolders": {
              "type": "array",
              "items": "empty"
            },
            "nextPageToken": {
              "type": "null"
            },
            "__typename": {
              "type": "string",
              "sample": "PagedAccountingSetFolderList"
            }
          }
        }
      }
    }
  }
}
```

---

## AccountingSets

**Hash**: `592c04919b9124d30d6213c87b8df9d02be8c7dbe60f068b77e5f3519e0ddcae`

### Variables

```json
{
  "input": {
    "patientId": "null",
    "parentFolderId": "null",
    "patientIdFilterMode": "string",
    "parentFolderFilterMode": "string",
    "searchDate": "string",
    "query": "string",
    "pageSize": "number",
    "pageToken": "null"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "accountingSets": {
          "type": "object",
          "properties": {
            "accountingSets": {
              "type": "array",
              "items": "empty"
            },
            "nextPageToken": {
              "type": "null"
            },
            "__typename": {
              "type": "string",
              "sample": "PagedAccountingSetList"
            }
          }
        }
      }
    }
  }
}
```

---

## AuthenticateToken

**Hash**: `f77279c503846ff7a5a3a6fe7abaf58139f99c4c7fc69a3d5c41fa2725f8d97c`

### Variables

```json
{
  "type": "object",
  "properties": {
    "organizationUuid": {
      "type": "string",
      "sample": "ce6b556b-2a8d-4fce-b8dd-89ba638fc825"
    },
    "token": {
      "type": "string",
      "sample": "eyJhbGciOiJSUzI1NiIsImtpZCI6ImEzOGVhNmEwNDA4YjBjYzVkYTE4OWRmYzg4ODgyZDBmMWI3ZmJmMGUiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoi5LqA5bGx55yf5LiA6YOOIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0pvVzVmMVEzOTB1ZmJ1azQ4VUNtSFdBQ3I4eFFwS2tnYkdKM0ozbXV0enkwd0JUUT1zOTYtYyIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS9oZW5yeS1wcm9kIiwiYXVkIjoiaGVucnktcHJvZCIsImF1dGhfdGltZSI6MTc2NzA1NDI5MiwidXNlcl9pZCI6InhnREhNbUJKUVZNSFdmeGlXNkFwNVk4NGZoNTIiLCJzdWIiOiJ4Z0RITW1CSlFWTUhXZnhpVzZBcDVZODRmaDUyIiwiaWF0IjoxNzY3MTc5NjIxLCJleHAiOjE3NjcxODMyMjEsImVtYWlsIjoic2hpbmljaGlyb19rYW1leWFtYUBtYW9rYWhwLm5ldCIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7Imdvb2dsZS5jb20iOlsiMTE3MTg0NzAzMTExMTg3ODQ4NzUxIl0sImVtYWlsIjpbInNoaW5pY2hpcm9fa2FtZXlhbWFAbWFva2FocC5uZXQiXX0sInNpZ25faW5fcHJvdmlkZXIiOiJnb29nbGUuY29tIn19.orLg1y--lonngSYoQO0JXQsjZZEQZAaa4STTaEEBmD1e00BQj8nqCoHSXauLd_nnzFP00L0dFFrsymcVLW-t3zxfMFSFXPQLu6t6KVu4SOPrKlqyGLxIhDSXUTsrZXYNyud-Ej5ohwLJD5lOueUDnKilnC1gRvZu0gbixcmGp6yw_h4zx3ak787vAG7H8r0llBr85vy2O7MT4n4cAgcl_9DxunENgtZSHFh99-FeZ1svKrDDcJpBDYx7T6ejuAaPR0v-km_R1emLzq9agfDd3BWJoC5dYS2aOKPu3fonPXedjhEa0W28n8LFpXVuV8-UvKnDyzj6mMzRez_9IYwtJQ"
    },
    "isLogin": {
      "type": "boolean",
      "sample": false
    }
  }
}
```

### Response Schema

```json

```

---

## ChannelTalkMemberHash

**Hash**: `d23a491eebbad0719d34b46feaf96de956b02ed3807724ba1bb90d85e6be9946`

### Variables

```json
{
  "type": "object",
  "properties": {}
}
```

### Response Schema

```json

```

---

## ChargeItemDefinitions

**Hash**: `e92aaa0c26e576bffc97e58967463408f06a15052430a0a29d80d6354ee52af3`

### Variables

```json
{
  "input": {
    "pageSize": "number",
    "isOutpatient": "boolean",
    "excludeNyuinRyo": "boolean",
    "excludeShoho": "boolean",
    "includeUnchangeableLongTermListedMedicineForMedicalNecessity": "boolean",
    "query": "string",
    "searchDate": "string",
    "extendedShinryoShikibetsu": "string",
    "diagnosisCodesForMhlwComments": "[]",
    "medicineCodesForMhlwComments": "[]",
    "pageToken": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "chargeItemDefinitions": {
          "type": "object",
          "properties": {
            "items": {
              "type": "array",
              "length": 200,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "equipment": {
                      "type": "null"
                    },
                    "medicine": {
                      "type": "null"
                    },
                    "comment": {
                      "type": "null"
                    },
                    "diagnosis": {
                      "type": "object",
                      "properties": {
                        "mhlwDiagnosis": {
                          "type": "object",
                          "properties": {
                            "id": {
                              "type": "string",
                              "sample": "16016015020240601"
                            },
                            "code": {
                              "type": "string",
                              "sample": "160160150"
                            },
                            "name": {
                              "type": "string",
                              "sample": "（１→３）−β−Ｄ−グルカン"
                            },
                            "unitCode": {
                              "type": "number",
                              "sample": 0
                            },
                            "pointType": {
                              "type": "number",
                              "sample": 3
                            },
                            "point": {
                              "type": "object",
                              "properties": {
                                "value": {
                                  "type": "number",
                                  "sample": 19500
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "Frac100"
                                }
                              }
                            },
                            "isStepValueRequiredForCalculation": {
                              "type": "boolean",
                              "sample": false
                            },
                            "minStepValue": {
                              "type": "number",
                              "sample": 0
                            },
                            "maxStepValue": {
                              "type": "number",
                              "sample": 99999999
                            },
                            "stepValue": {
                              "type": "number",
                              "sample": 0
                            },
                            "isDiminishing": {
                              "type": "boolean",
                              "sample": false
                            },
                            "startDate": {
                              "type": "object",
                              "properties": {
                                "day": {
                                  "type": "number",
                                  "sample": 1
                                },
                                "month": {
                                  "type": "number",
                                  "sample": 6
                                },
                                "year": {
                                  "type": "number",
                                  "sample": 2024
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "Date"
                                }
                              }
                            },
                            "endDate": {
                              "type": "null"
                            },
                            "applicableShinryoShikibetsuCodes": {
                              "type": "array",
                              "length": 1,
                              "items": [
                                {
                                  "type": "string",
                                  "sample": "60"
                                }
                              ]
                            },
                            "isInpatientUsable": {
                              "type": "boolean",
                              "sample": true
                            },
                            "isOutpatientUsable": {
                              "type": "boolean",
                              "sample": true
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "MhlwDiagnosis"
                            }
                          }
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "ChargeItemDiagnosis"
                        }
                      }
                    },
                    "nonHealthcareSystem": {
                      "type": "null"
                    },
                    "medicationUsageComment": {
                      "type": "null"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "ChargeItemDefinition"
                    }
                  }
                }
              ]
            },
            "nextPageToken": {
              "type": "string",
              "sample": "eyJtdWx0aXBsZVNlYXJjaFRhcmdldCI6eyJ0eXBlIjoianAuaG..."
            },
            "__typename": {
              "type": "string",
              "sample": "ChargeItemDefinitions"
            }
          }
        }
      }
    }
  }
}
```

---

## ClinicalCalendarView

**Hash**: `0dddbf29ccc764f3b44069eda872732bcb470ee82e18f7256957ec52884f9dd7`

### Variables

```json
{
  "type": "object",
  "properties": {
    "patientId": {
      "type": "string",
      "sample": "2bfecb0b-d770-4932-beb4-49c16e63ae8c"
    },
    "baseDate": {
      "type": "string",
      "sample": "2025-12-31"
    },
    "beforeDateSize": {
      "type": "number",
      "sample": 14
    },
    "afterDateSize": {
      "type": "number",
      "sample": 14
    },
    "clinicalResourceHrns": {
      "type": "array",
      "length": 4,
      "items": [
        {
          "type": "string",
          "sample": "//henry-app.jp/clinicalResource/customClinicalDocument/f639619a-6fdb-452a-a803-8d42cd50830d"
        }
      ]
    },
    "createUserIds": {
      "type": "array",
      "length": 98,
      "items": [
        {
          "type": "string",
          "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
        }
      ]
    },
    "accountingOrderShinryoShikibetsus": {
      "type": "array",
      "length": 0,
      "items": "empty"
    },
    "includeRevoked": {
      "type": "boolean",
      "sample": false
    }
  }
}
```

### Response Schema

```json

```

---

## CreateClinicalDocument

**Hash**: `f1058bae8bc58c0fec53500fee346768f415f9a009724c6342186987c5d48199`

### Variables

```json
{
  "input": {
    "uuid": "string",
    "patientUuid": "string",
    "editorData": "string",
    "type": {
      "type": "string",
      "clinicalDocumentCustomTypeUuid": "null"
    },
    "performTime": {
      "seconds": "number",
      "nanos": "number"
    },
    "hospitalizationUuid": {
      "value": "string"
    }
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "createClinicalDocument": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "416b95c4-0252-41c9-9ac4-3d456551bca6"
            },
            "hospitalizationUuid": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "7fed3631-0d9b-4f1e-a4e5-60cde1d21cfe"
                },
                "__typename": {
                  "type": "string",
                  "sample": "StringValue"
                }
              }
            },
            "patientUuid": {
              "type": "string",
              "sample": "5cb2ec51-3d68-4788-8775-eafff2a5429f"
            },
            "creatorUuid": {
              "type": "string",
              "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
            },
            "lastAuthorUuid": {
              "type": "string",
              "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
            },
            "editorData": {
              "type": "string",
              "sample": "{\n  \"blocks\": [\n    {\n      \"key\": \"e82n9\",\n      ..."
            },
            "type": {
              "type": "object",
              "properties": {
                "clinicalDocumentCustomTypeUuid": {
                  "type": "null"
                },
                "type": {
                  "type": "string",
                  "sample": "HOSPITALIZATION_CONSULTATION"
                },
                "excerptType": {
                  "type": "string",
                  "sample": "TRUNCATED"
                },
                "clinicalDocumentCustomType": {
                  "type": "null"
                },
                "__typename": {
                  "type": "string",
                  "sample": "ClinicalDocumentType"
                }
              }
            },
            "performTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767401460
                },
                "nanos": {
                  "type": "number",
                  "sample": 0
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "createTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767401580
                },
                "nanos": {
                  "type": "number",
                  "sample": 132264000
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "updateTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767401580
                },
                "nanos": {
                  "type": "number",
                  "sample": 132264000
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "patient": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "5cb2ec51-3d68-4788-8775-eafff2a5429f"
                },
                "serialNumber": {
                  "type": "string",
                  "sample": "19883"
                },
                "serialNumberPrefix": {
                  "type": "string",
                  "sample": ""
                },
                "fullName": {
                  "type": "string",
                  "sample": "北村 浩久"
                },
                "fullNamePhonetic": {
                  "type": "string",
                  "sample": "キタムラ ヒロヒサ"
                },
                "isDraft": {
                  "type": "boolean",
                  "sample": false
                },
                "isTestPatient": {
                  "type": "boolean",
                  "sample": false
                },
                "detail": {
                  "type": "object",
                  "properties": {
                    "patientUuid": {
                      "type": "string",
                      "sample": "5cb2ec51-3d68-4788-8775-eafff2a5429f"
                    },
                    "addressLine_1": {
                      "type": "string",
                      "sample": "香川県高松市木太町1734－7"
                    },
                    "addressLine_2": {
                      "type": "string",
                      "sample": ""
                    },
                    "postalCode": {
                      "type": "string",
                      "sample": "7600080"
                    },
                    "email": {
                      "type": "string",
                      "sample": ""
                    },
                    "phoneNumber": {
                      "type": "string",
                      "sample": "09013246216"
                    },
                    "sexType": {
                      "type": "string",
                      "sample": "SEX_TYPE_MALE"
                    },
                    "birthDate": {
                      "type": "object",
                      "properties": {
                        "year": {
                          "type": "number",
                          "sample": 1960
                        },
                        "month": {
                          "type": "number",
                          "sample": 3
                        },
                        "day": {
                          "type": "number",
                          "sample": 7
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Date"
                        }
                      }
                    },
                    "memo": {
                      "type": "string",
                      "sample": "急変時県立中央病院に搬送してほしい。高額療養0707 0708 0709   一包化 壱番町ドーム薬..."
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "PatientDetail"
                    }
                  }
                },
                "tags": {
                  "type": "array",
                  "length": 8,
                  "items": [
                    {
                      "type": "string",
                      "sample": "重度褥瘡処置は2026/1/18まで"
                    }
                  ]
                },
                "attentionSummary": {
                  "type": "object",
                  "properties": {
                    "hasAnyInfection": {
                      "type": "boolean",
                      "sample": false
                    },
                    "hasAnyAllergy": {
                      "type": "boolean",
                      "sample": false
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "PatientAttentionSummary"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "Patient"
                }
              }
            },
            "lastAuthor": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                },
                "name": {
                  "type": "string",
                  "sample": "亀山　真一郎"
                },
                "namePhonetic": {
                  "type": "object",
                  "properties": {
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    },
                    "value": {
                      "type": "string",
                      "sample": "カメヤマ　シンイチロウ"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "creator": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                },
                "name": {
                  "type": "string",
                  "sample": "亀山　真一郎"
                },
                "namePhonetic": {
                  "type": "object",
                  "properties": {
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    },
                    "value": {
                      "type": "string",
                      "sample": "カメヤマ　シンイチロウ"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "__typename": {
              "type": "string",
              "sample": "ClinicalDocument"
            }
          }
        }
      }
    }
  }
}
```

---

## CreateImagingOrder

**Hash**: `c103a6885b44bc1cbfe1128dfc71e490c1250a6d32d3ed51b4fc7eaebf4d3d20`

### Variables

```json
{
  "input": {
    "uuid": "string",
    "patientUuid": "string",
    "doctorUuid": "string",
    "date": {
      "year": "number",
      "month": "number",
      "day": "number"
    },
    "detail": {
      "uuid": "string",
      "imagingModality": "string",
      "note": "string",
      "condition": {
        "plainRadiographyDigital": {
          "series": [
            "max_depth"
          ]
        }
      }
    },
    "sessionUuid": "null",
    "revokeDescription": "string",
    "encounterId": "null",
    "extendedInsuranceCombinationId": "null",
    "saveAsDraft": "boolean"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "createImagingOrder": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "15b5d4c9-a5df-45f9-a2ff-0d11751d322f"
            },
            "patientUuid": {
              "type": "string",
              "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
            },
            "patient": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
                },
                "__typename": {
                  "type": "string",
                  "sample": "Patient"
                }
              }
            },
            "doctorUuid": {
              "type": "string",
              "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
            },
            "sessionUuid": {
              "type": "null"
            },
            "orderStatus": {
              "type": "string",
              "sample": "ORDER_STATUS_ON_HOLD"
            },
            "date": {
              "type": "object",
              "properties": {
                "year": {
                  "type": "number",
                  "sample": 2026
                },
                "month": {
                  "type": "number",
                  "sample": 1
                },
                "day": {
                  "type": "number",
                  "sample": 2
                },
                "__typename": {
                  "type": "string",
                  "sample": "Date"
                }
              }
            },
            "createTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767352167
                },
                "nanos": {
                  "type": "number",
                  "sample": 247539763
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "updateTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767352167
                },
                "nanos": {
                  "type": "number",
                  "sample": 247539763
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "detail": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "15b5d4c9-a5df-45f9-a2ff-0d11751d322f"
                },
                "imagingModality": {
                  "type": "string",
                  "sample": "IMAGING_MODALITY_PLAIN_RADIOGRAPHY_DIGITAL"
                },
                "note": {
                  "type": "string",
                  "sample": ""
                },
                "condition": {
                  "type": "object",
                  "properties": {
                    "plainRadiographyAnalog": {
                      "type": "null"
                    },
                    "plainRadiographyDigital": {
                      "type": "object",
                      "properties": {
                        "series": {
                          "type": "array",
                          "length": 1,
                          "items": [
                            {
                              "type": "object",
                              "properties": {
                                "bodySiteUuid": {
                                  "type": "string",
                                  "sample": "85c436f8-fdb5-40d5-9cc2-ca3c55562b94"
                                },
                                "uuid": {
                                  "type": "string",
                                  "sample": "d0c2487b-015e-46ea-89e2-0939ade805d3"
                                },
                                "bodyPositions": {
                                  "type": "array",
                                  "length": 1,
                                  "items": [
                                    {
                                      "type": "max_depth"
                                    }
                                  ]
                                },
                                "filmCount": {
                                  "type": "null"
                                },
                                "configuration": {
                                  "type": "string",
                                  "sample": "110kVp,10mAs,200cm"
                                },
                                "note": {
                                  "type": "string",
                                  "sample": "正面"
                                },
                                "laterality": {
                                  "type": "string",
                                  "sample": "LATERALITY_NONE"
                                },
                                "bodySite": {
                                  "type": "object",
                                  "properties": {
                                    "uuid": {
                                      "type": "max_depth"
                                    },
                                    "name": {
                                      "type": "max_depth"
                                    },
                                    "lateralityRequirement": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "isAccountingIgnored": {
                                  "type": "boolean",
                                  "sample": false
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "ImagingOrderDetail_PlainRadiographyDigitalConditio..."
                                }
                              }
                            }
                          ]
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "ImagingOrderDetail_PlainRadiographyDigitalConditio..."
                        }
                      }
                    },
                    "contrastAgentRadiographyAnalog": {
                      "type": "null"
                    },
                    "contrastAgentRadiographyDigital": {
                      "type": "null"
                    },
                    "ct": {
                      "type": "null"
                    },
                    "md": {
                      "type": "null"
                    },
                    "mriOther": {
                      "type": "null"
                    },
                    "mriAbove_1_5AndBelow_3Tesla": {
                      "type": "null"
                    },
                    "dexa": {
                      "type": "null"
                    },
                    "fluoroscopy": {
                      "type": "null"
                    },
                    "dip": {
                      "type": "null"
                    },
                    "sexa": {
                      "type": "null"
                    },
                    "qus": {
                      "type": "null"
                    },
                    "mammographyAnalog": {
                      "type": "null"
                    },
                    "mammographyDigital": {
                      "type": "null"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "ImagingOrderDetail_Condition"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "ImagingOrderDetail"
                }
              }
            },
            "revokeDescription": {
              "type": "string",
              "sample": ""
            },
            "doctor": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                },
                "name": {
                  "type": "string",
                  "sample": "亀山　真一郎"
                },
                "namePhonetic": {
                  "type": "object",
                  "properties": {
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    },
                    "value": {
                      "type": "string",
                      "sample": "カメヤマ　シンイチロウ"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "createUser": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                },
                "name": {
                  "type": "string",
                  "sample": "亀山　真一郎"
                },
                "namePhonetic": {
                  "type": "object",
                  "properties": {
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    },
                    "value": {
                      "type": "string",
                      "sample": "カメヤマ　シンイチロウ"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "updateUser": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                },
                "name": {
                  "type": "string",
                  "sample": "亀山　真一郎"
                },
                "namePhonetic": {
                  "type": "object",
                  "properties": {
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    },
                    "value": {
                      "type": "string",
                      "sample": "カメヤマ　シンイチロウ"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "encounterId": {
              "type": "null"
            },
            "extendedInsuranceCombinationId": {
              "type": "null"
            },
            "isDraft": {
              "type": "boolean",
              "sample": false
            },
            "isOutpatient": {
              "type": "boolean",
              "sample": false
            },
            "__typename": {
              "type": "string",
              "sample": "ImagingOrder"
            }
          }
        }
      }
    }
  }
}
```

---

## CreateImagingOrderOrderStatusAction

**Hash**: `fc791f1dad434353d9c478ca30fbf7cf7055cf54ec255e7e6ec115f1fa7eed0d`

### Variables

```json
{
  "input": {
    "uuid": "string",
    "orderStatusAction": "string",
    "revokeDescription": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "createImagingOrderOrderStatusAction": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "1495d08c-490c-4284-9dc9-d582413db9c5"
            },
            "patientUuid": {
              "type": "string",
              "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
            },
            "patient": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
                },
                "__typename": {
                  "type": "string",
                  "sample": "Patient"
                }
              }
            },
            "doctorUuid": {
              "type": "string",
              "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
            },
            "sessionUuid": {
              "type": "null"
            },
            "orderStatus": {
              "type": "string",
              "sample": "ORDER_STATUS_ACTIVE"
            },
            "date": {
              "type": "object",
              "properties": {
                "year": {
                  "type": "number",
                  "sample": 2025
                },
                "month": {
                  "type": "number",
                  "sample": 12
                },
                "day": {
                  "type": "number",
                  "sample": 31
                },
                "__typename": {
                  "type": "string",
                  "sample": "Date"
                }
              }
            },
            "createTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767144937
                },
                "nanos": {
                  "type": "number",
                  "sample": 371330000
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "updateTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767188054
                },
                "nanos": {
                  "type": "number",
                  "sample": 717503166
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "detail": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "1495d08c-490c-4284-9dc9-d582413db9c5"
                },
                "imagingModality": {
                  "type": "string",
                  "sample": "IMAGING_MODALITY_CT"
                },
                "note": {
                  "type": "string",
                  "sample": ""
                },
                "condition": {
                  "type": "object",
                  "properties": {
                    "plainRadiographyAnalog": {
                      "type": "null"
                    },
                    "plainRadiographyDigital": {
                      "type": "null"
                    },
                    "contrastAgentRadiographyAnalog": {
                      "type": "null"
                    },
                    "contrastAgentRadiographyDigital": {
                      "type": "null"
                    },
                    "ct": {
                      "type": "object",
                      "properties": {
                        "series": {
                          "type": "array",
                          "length": 1,
                          "items": [
                            {
                              "type": "object",
                              "properties": {
                                "bodySiteUuid": {
                                  "type": "string",
                                  "sample": "85c436f8-fdb5-40d5-9cc2-ca3c55562b94"
                                },
                                "uuid": {
                                  "type": "string",
                                  "sample": "722c0a90-ca02-478a-87a0-6d6a50dc146d"
                                },
                                "filmCount": {
                                  "type": "null"
                                },
                                "configuration": {
                                  "type": "string",
                                  "sample": ""
                                },
                                "note": {
                                  "type": "string",
                                  "sample": "頭部CT、胸部腹部CT、脊椎CT　　も同時に"
                                },
                                "laterality": {
                                  "type": "string",
                                  "sample": "LATERALITY_NONE"
                                },
                                "bodySite": {
                                  "type": "object",
                                  "properties": {
                                    "uuid": {
                                      "type": "max_depth"
                                    },
                                    "name": {
                                      "type": "max_depth"
                                    },
                                    "lateralityRequirement": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "medicines": {
                                  "type": "array",
                                  "items": "empty"
                                },
                                "isAccountingIgnored": {
                                  "type": "boolean",
                                  "sample": false
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "ImagingOrderDetail_CtCondition_Series"
                                }
                              }
                            }
                          ]
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "ImagingOrderDetail_CtCondition"
                        }
                      }
                    },
                    "md": {
                      "type": "null"
                    },
                    "mriOther": {
                      "type": "null"
                    },
                    "mriAbove_1_5AndBelow_3Tesla": {
                      "type": "null"
                    },
                    "dexa": {
                      "type": "null"
                    },
                    "fluoroscopy": {
                      "type": "null"
                    },
                    "dip": {
                      "type": "null"
                    },
                    "sexa": {
                      "type": "null"
                    },
                    "qus": {
                      "type": "null"
                    },
                    "mammographyAnalog": {
                      "type": "null"
                    },
                    "mammographyDigital": {
                      "type": "null"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "ImagingOrderDetail_Condition"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "ImagingOrderDetail"
                }
              }
            },
            "revokeDescription": {
              "type": "string",
              "sample": ""
            },
            "doctor": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                },
                "name": {
                  "type": "string",
                  "sample": "亀山　真一郎"
                },
                "namePhonetic": {
                  "type": "object",
                  "properties": {
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    },
                    "value": {
                      "type": "string",
                      "sample": "カメヤマ　シンイチロウ"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "createUser": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                },
                "name": {
                  "type": "string",
                  "sample": "亀山　真一郎"
                },
                "namePhonetic": {
                  "type": "object",
                  "properties": {
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    },
                    "value": {
                      "type": "string",
                      "sample": "カメヤマ　シンイチロウ"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "updateUser": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                },
                "name": {
                  "type": "string",
                  "sample": "亀山　真一郎"
                },
                "namePhonetic": {
                  "type": "object",
                  "properties": {
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    },
                    "value": {
                      "type": "string",
                      "sample": "カメヤマ　シンイチロウ"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "encounterId": {
              "type": "null"
            },
            "extendedInsuranceCombinationId": {
              "type": "null"
            },
            "isDraft": {
              "type": "boolean",
              "sample": false
            },
            "isOutpatient": {
              "type": "boolean",
              "sample": false
            },
            "__typename": {
              "type": "string",
              "sample": "ImagingOrder"
            }
          }
        }
      }
    }
  }
}
```

---

## CreateInjectionOrder

**Hash**: `d2aa4b945d70c96bfc99bda045ea98345f4c60f469a98d2a7e21949a2132b451`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "uuid": {
          "type": "string",
          "sample": "014a9859-e7bf-4bf1-92ed-a6808167ec7f"
        },
        "patientUuid": {
          "type": "string",
          "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
        },
        "doctorUuid": {
          "type": "string",
          "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
        },
        "medicationCategory": {
          "type": "string",
          "sample": "MEDICATION_CATEGORY_ORDINARY"
        },
        "startDate": {
          "type": "object",
          "properties": {
            "year": {
              "type": "number",
              "sample": 2025
            },
            "month": {
              "type": "number",
              "sample": 12
            },
            "day": {
              "type": "number",
              "sample": 31
            }
          }
        },
        "note": {
          "type": "string",
          "sample": ""
        },
        "revokeDescription": {
          "type": "string",
          "sample": ""
        },
        "rps": {
          "type": "array",
          "length": 1,
          "items": [
            {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "ed22a8b1-2f4b-4f96-a265-39bc238b38d4"
                },
                "boundsDurationDays": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "type": "number",
                      "sample": 7
                    }
                  }
                },
                "dosageRate": {
                  "type": "object",
                  "properties": {
                    "rateQuantityHour": {
                      "type": "null",
                      "sample": null
                    },
                    "rateQuantityMinute": {
                      "type": "null",
                      "sample": null
                    },
                    "rateQuantitySecond": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "number",
                          "sample": 110
                        }
                      }
                    },
                    "rateQuantityPerHour": {
                      "type": "null",
                      "sample": null
                    },
                    "rateQuantityPerMinute": {
                      "type": "null",
                      "sample": null
                    },
                    "rateQuantityPerSecond": {
                      "type": "null",
                      "sample": null
                    }
                  }
                },
                "instructions": {
                  "type": "array",
                  "length": 1,
                  "items": [
                    {
                      "type": "object",
                      "properties": {
                        "instruction": {
                          "type": "object",
                          "properties": {
                            "medicationDosageInstruction": {
                              "type": "object",
                              "properties": {
                                "uuid": {
                                  "type": "string",
                                  "sample": "7ef1ca89-9ef2-45ed-b05f-858457c7f855"
                                },
                                "localMedicineUuid": {
                                  "type": "object",
                                  "properties": {
                                    "value": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "mhlwMedicineId": {
                                  "type": "string",
                                  "sample": "62241100120250401"
                                },
                                "isIngredientQuantity": {
                                  "type": "boolean",
                                  "sample": false
                                },
                                "quantity": {
                                  "type": "object",
                                  "properties": {
                                    "dispenseQuantity": {
                                      "type": "max_depth"
                                    },
                                    "doseQuantity": {
                                      "type": "max_depth"
                                    },
                                    "doseQuantityPerDay": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "receiptComments": {
                                  "type": "array",
                                  "length": 0,
                                  "items": "empty"
                                },
                                "showInPrescriptionRemarks": {
                                  "type": "boolean",
                                  "sample": false
                                },
                                "isGenericNameProhibited": {
                                  "type": "boolean",
                                  "sample": false
                                },
                                "isAccountingIgnored": {
                                  "type": "boolean",
                                  "sample": false
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  ]
                },
                "isBringing": {
                  "type": "boolean",
                  "sample": false
                },
                "isWardStock": {
                  "type": "boolean",
                  "sample": false
                },
                "dosageText": {
                  "type": "string",
                  "sample": ""
                },
                "localInjectionTechniqueUuid": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "type": "string",
                      "sample": "053df891-7a18-49d5-a933-6ed5cb689887"
                    }
                  }
                },
                "medicationTiming": {
                  "type": "object",
                  "properties": {
                    "medicationTiming": {
                      "type": "object",
                      "properties": {
                        "canonicalPrescriptionUsageUuid": {
                          "type": "null",
                          "sample": null
                        },
                        "timesOfDay": {
                          "type": "object",
                          "properties": {
                            "timesOfDay": {
                              "type": "array",
                              "length": 1,
                              "items": [
                                {
                                  "type": "object",
                                  "properties": {
                                    "hours": {
                                      "type": "max_depth"
                                    },
                                    "minutes": {
                                      "type": "max_depth"
                                    },
                                    "seconds": {
                                      "type": "max_depth"
                                    }
                                  }
                                }
                              ]
                            }
                          }
                        }
                      }
                    }
                  }
                },
                "slidingScaleEnabled": {
                  "type": "boolean",
                  "sample": false
                }
              }
            }
          ]
        },
        "encounterId": {
          "type": "null",
          "sample": null
        },
        "saveAsDraft": {
          "type": "boolean",
          "sample": false
        },
        "extendedInsuranceCombinationId": {
          "type": "null",
          "sample": null
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## CreateInjectionOrderOrderStatusAction

**Hash**: `14f3ea60095cce66cc984d0f3e9b57963077b826c4f7be7e56966fe047528fcd`

### Variables

```json
{
  "input": {
    "uuid": "string",
    "orderStatusAction": "string",
    "revokeDescription": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "createInjectionOrderOrderStatusAction": {
          "type": "object",
          "properties": {
            "createTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767182581
                },
                "nanos": {
                  "type": "number",
                  "sample": 895446000
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "createUser": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                },
                "name": {
                  "type": "string",
                  "sample": "亀山　真一郎"
                },
                "namePhonetic": {
                  "type": "object",
                  "properties": {
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    },
                    "value": {
                      "type": "string",
                      "sample": "カメヤマ　シンイチロウ"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "doctor": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                },
                "name": {
                  "type": "string",
                  "sample": "亀山　真一郎"
                },
                "namePhonetic": {
                  "type": "object",
                  "properties": {
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    },
                    "value": {
                      "type": "string",
                      "sample": "カメヤマ　シンイチロウ"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "doctorUuid": {
              "type": "string",
              "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
            },
            "medicationCategory": {
              "type": "string",
              "sample": "MEDICATION_CATEGORY_ORDINARY"
            },
            "narcoticPractitioner": {
              "type": "null"
            },
            "narcoticPractitionerUuid": {
              "type": "null"
            },
            "note": {
              "type": "string",
              "sample": ""
            },
            "orderStatus": {
              "type": "string",
              "sample": "ORDER_STATUS_ACTIVE"
            },
            "patient": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
                },
                "serialNumber": {
                  "type": "string",
                  "sample": "00001"
                },
                "serialNumberPrefix": {
                  "type": "string",
                  "sample": ""
                },
                "fullName": {
                  "type": "string",
                  "sample": "テスト 1"
                },
                "fullNamePhonetic": {
                  "type": "string",
                  "sample": "テスト イチ"
                },
                "isDraft": {
                  "type": "boolean",
                  "sample": false
                },
                "isTestPatient": {
                  "type": "boolean",
                  "sample": true
                },
                "detail": {
                  "type": "object",
                  "properties": {
                    "patientUuid": {
                      "type": "string",
                      "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
                    },
                    "addressLine_1": {
                      "type": "string",
                      "sample": "香川県高松市テスト町"
                    },
                    "addressLine_2": {
                      "type": "string",
                      "sample": "てすとマンション"
                    },
                    "postalCode": {
                      "type": "string",
                      "sample": "123-4567"
                    },
                    "email": {
                      "type": "string",
                      "sample": "test1@test.com"
                    },
                    "phoneNumber": {
                      "type": "string",
                      "sample": "123456789"
                    },
                    "sexType": {
                      "type": "string",
                      "sample": "SEX_TYPE_MALE"
                    },
                    "birthDate": {
                      "type": "object",
                      "properties": {
                        "year": {
                          "type": "number",
                          "sample": 1975
                        },
                        "month": {
                          "type": "number",
                          "sample": 9
                        },
                        "day": {
                          "type": "number",
                          "sample": 18
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Date"
                        }
                      }
                    },
                    "memo": {
                      "type": "string",
                      "sample": "急変時は日赤に搬送希望あり"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "PatientDetail"
                    }
                  }
                },
                "tags": {
                  "type": "array",
                  "length": 2,
                  "items": [
                    {
                      "type": "string",
                      "sample": "test"
                    }
                  ]
                },
                "attentionSummary": {
                  "type": "object",
                  "properties": {
                    "hasAnyInfection": {
                      "type": "boolean",
                      "sample": false
                    },
                    "hasAnyAllergy": {
                      "type": "boolean",
                      "sample": false
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "PatientAttentionSummary"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "Patient"
                }
              }
            },
            "patientUuid": {
              "type": "string",
              "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
            },
            "revokeDescription": {
              "type": "string",
              "sample": ""
            },
            "rps": {
              "type": "array",
              "length": 1,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "ed22a8b1-2f4b-4f96-a265-39bc238b38d4"
                    },
                    "isBringing": {
                      "type": "boolean",
                      "sample": false
                    },
                    "isWardStock": {
                      "type": "boolean",
                      "sample": false
                    },
                    "medicationTiming": {
                      "type": "object",
                      "properties": {
                        "medicationTiming": {
                          "type": "object",
                          "properties": {
                            "canonicalPrescriptionUsage": {
                              "type": "null"
                            },
                            "canonicalPrescriptionUsageUuid": {
                              "type": "null"
                            },
                            "timesOfDay": {
                              "type": "object",
                              "properties": {
                                "timesOfDay": {
                                  "type": "array",
                                  "length": 1,
                                  "items": [
                                    {
                                      "type": "max_depth"
                                    }
                                  ]
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "MedicationTiming_TimesOfDay"
                                }
                              }
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "MedicationTiming_medicationTiming"
                            }
                          }
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "MedicationTiming"
                        }
                      }
                    },
                    "slidingScaleEnabled": {
                      "type": "boolean",
                      "sample": false
                    },
                    "dosageText": {
                      "type": "string",
                      "sample": ""
                    },
                    "boundsDurationDays": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "number",
                          "sample": 7
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "UInt32Value"
                        }
                      }
                    },
                    "dosageRate": {
                      "type": "object",
                      "properties": {
                        "rateQuantityHour": {
                          "type": "null"
                        },
                        "rateQuantityMinute": {
                          "type": "null"
                        },
                        "rateQuantitySecond": {
                          "type": "object",
                          "properties": {
                            "value": {
                              "type": "number",
                              "sample": 110
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "Frac10"
                            }
                          }
                        },
                        "rateQuantityPerHour": {
                          "type": "null"
                        },
                        "rateQuantityPerMinute": {
                          "type": "null"
                        },
                        "rateQuantityPerSecond": {
                          "type": "null"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "InjectionOrderRp_dosageRate"
                        }
                      }
                    },
                    "localInjectionTechnique": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string",
                          "sample": "053df891-7a18-49d5-a933-6ed5cb689887"
                        },
                        "name": {
                          "type": "string",
                          "sample": "筋肉内注射"
                        },
                        "masterId": {
                          "type": "string",
                          "sample": "1_4"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "InjectionTechnique"
                        }
                      }
                    },
                    "localInjectionTechniqueUuid": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "string",
                          "sample": "053df891-7a18-49d5-a933-6ed5cb689887"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "StringValue"
                        }
                      }
                    },
                    "instructions": {
                      "type": "array",
                      "length": 1,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "instruction": {
                              "type": "object",
                              "properties": {
                                "equipmentInstruction": {
                                  "type": "null"
                                },
                                "medicationDosageInstruction": {
                                  "type": "object",
                                  "properties": {
                                    "isIngredientQuantity": {
                                      "type": "max_depth"
                                    },
                                    "localMedicine": {
                                      "type": "max_depth"
                                    },
                                    "localMedicineUuid": {
                                      "type": "max_depth"
                                    },
                                    "mhlwMedicine": {
                                      "type": "max_depth"
                                    },
                                    "mhlwMedicineId": {
                                      "type": "max_depth"
                                    },
                                    "quantity": {
                                      "type": "max_depth"
                                    },
                                    "receiptComments": {
                                      "type": "max_depth"
                                    },
                                    "uuid": {
                                      "type": "max_depth"
                                    },
                                    "isAccountingIgnored": {
                                      "type": "max_depth"
                                    },
                                    "showInPrescriptionRemarks": {
                                      "type": "max_depth"
                                    },
                                    "isGenericNameProhibited": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "InjectionOrderRp_Instruction_instruction"
                                }
                              }
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "InjectionOrderRp_Instruction"
                            }
                          }
                        }
                      ]
                    },
                    "stoppedDate": {
                      "type": "null"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "InjectionOrderRp"
                    }
                  }
                }
              ]
            },
            "startDate": {
              "type": "object",
              "properties": {
                "year": {
                  "type": "number",
                  "sample": 2025
                },
                "month": {
                  "type": "number",
                  "sample": 12
                },
                "day": {
                  "type": "number",
                  "sample": 31
                },
                "__typename": {
                  "type": "string",
                  "sample": "Date"
                }
              }
            },
            "updateTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767182581
                },
                "nanos": {
                  "type": "number",
                  "sample": 895446000
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "updateUser": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                },
                "name": {
                  "type": "string",
                  "sample": "亀山　真一郎"
                },
                "namePhonetic": {
                  "type": "object",
                  "properties": {
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    },
                    "value": {
                      "type": "string",
                      "sample": "カメヤマ　シンイチロウ"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "uuid": {
              "type": "string",
              "sample": "014a9859-e7bf-4bf1-92ed-a6808167ec7f"
            },
            "encounterId": {
              "type": "null"
            },
            "extendedInsuranceCombinationId": {
              "type": "null"
            },
            "isDraft": {
              "type": "boolean",
              "sample": false
            },
            "isOutpatient": {
              "type": "boolean",
              "sample": false
            },
            "__typename": {
              "type": "string",
              "sample": "InjectionOrder"
            }
          }
        }
      }
    }
  }
}
```

---

## CreatePatient

**Hash**: `bd1e2f21250aab4cf74517ff75353567f2c61e754ff1fbcb1b55e531ee6c94de`

### Variables

```json
{
  "input": {
    "patient": {
      "uuid": "string",
      "fullName": "string",
      "fullNamePhonetic": "string",
      "serialNumberPrefix": "string",
      "isDraft": "boolean",
      "isTestPatient": "boolean",
      "detail": {
        "patientUuid": "string",
        "sexType": "string",
        "birthDate": "null",
        "phoneNumber": "string",
        "email": "string",
        "memo": "string",
        "addressLine_1": "string",
        "addressLine_2": "string",
        "postalCode": "string"
      },
      "tags": "[]"
    }
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "createPatient": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "fe289381-c515-413b-aec0-45f0873f3df0"
            },
            "serialNumber": {
              "type": "string",
              "sample": ""
            },
            "serialNumberPrefix": {
              "type": "string",
              "sample": ""
            },
            "fullName": {
              "type": "string",
              "sample": ""
            },
            "fullNamePhonetic": {
              "type": "string",
              "sample": ""
            },
            "isDraft": {
              "type": "boolean",
              "sample": true
            },
            "isTestPatient": {
              "type": "boolean",
              "sample": false
            },
            "detail": {
              "type": "object",
              "properties": {
                "patientUuid": {
                  "type": "string",
                  "sample": "fe289381-c515-413b-aec0-45f0873f3df0"
                },
                "addressLine_1": {
                  "type": "string",
                  "sample": ""
                },
                "addressLine_2": {
                  "type": "string",
                  "sample": ""
                },
                "postalCode": {
                  "type": "string",
                  "sample": ""
                },
                "email": {
                  "type": "string",
                  "sample": ""
                },
                "phoneNumber": {
                  "type": "string",
                  "sample": ""
                },
                "sexType": {
                  "type": "string",
                  "sample": "SEX_TYPE_UNSPECIFIED"
                },
                "birthDate": {
                  "type": "null"
                },
                "memo": {
                  "type": "string",
                  "sample": ""
                },
                "__typename": {
                  "type": "string",
                  "sample": "PatientDetail"
                }
              }
            },
            "tags": {
              "type": "array",
              "items": "empty"
            },
            "attentionSummary": {
              "type": "object",
              "properties": {
                "hasAnyInfection": {
                  "type": "boolean",
                  "sample": false
                },
                "hasAnyAllergy": {
                  "type": "boolean",
                  "sample": false
                },
                "__typename": {
                  "type": "string",
                  "sample": "PatientAttentionSummary"
                }
              }
            },
            "__typename": {
              "type": "string",
              "sample": "Patient"
            }
          }
        }
      }
    }
  }
}
```

---

## CreatePatientFile

**Hash**: `93826724327f89b5918c61e88118b5bebb69c996612fdaea589372f77779707c`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "2bfecb0b-d770-4932-beb4-49c16e63ae8c"
        },
        "parentFileFolderUuid": {
          "type": "null",
          "sample": null
        },
        "fileUrl": {
          "type": "string",
          "sample": "gs://henry-files-production/organizations/ce6b556b-2a8d-4fce-b8dd-89ba638fc825/patient_file/c8a38de2-ca70-4e85-ab90-f7922ed13b30"
        },
        "title": {
          "type": "string",
          "sample": "診療情報提供書 (1).docx"
        },
        "description": {
          "type": "string",
          "sample": ""
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## CreatePatientFileFromPatientDocumentTemplate

**Hash**: `83624d7ec7d72d0f3eb25f3c4d4551bca5d7effefc2f605797d7b6858b23bee1`

### Variables

```json
{
  "input": {
    "patientDocumentTemplateUuid": "string",
    "sessionUuid": "null",
    "patientUuid": "string",
    "placeholders": "[]"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "createPatientFileFromPatientDocumentTemplate": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "cbd6fe9e-feab-4e6d-a4e6-42ae689cb590"
            },
            "createTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767227563
                },
                "nanos": {
                  "type": "number",
                  "sample": 156939000
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "file": {
              "type": "object",
              "properties": {
                "mimeType": {
                  "type": "string",
                  "sample": "application/vnd.openxmlformats-officedocument.word..."
                },
                "fileType": {
                  "type": "string",
                  "sample": "FILE_TYPE_DOCX"
                },
                "redirectUrl": {
                  "type": "string",
                  "sample": "https://storage.googleapis.com/henry-files-product..."
                },
                "fileSize": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "type": "number",
                      "sample": 75635
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "UInt32Value"
                    }
                  }
                },
                "previewImageUrl": {
                  "type": "null"
                },
                "imageWidth": {
                  "type": "null"
                },
                "imageHeight": {
                  "type": "null"
                },
                "title": {
                  "type": "string",
                  "sample": "受診報告"
                },
                "description": {
                  "type": "string",
                  "sample": ""
                },
                "__typename": {
                  "type": "string",
                  "sample": "AttachmentFile"
                }
              }
            },
            "__typename": {
              "type": "string",
              "sample": "PatientFile"
            }
          }
        }
      }
    }
  }
}
```

---

## CreatePrescriptionOrderOrderStatusAction

**Hash**: `20f5de5d62f86b8f587939faf742967da76e0580bb39cc78dab1c197b1cc8c1b`

### Variables

```json
{
  "input": {
    "uuid": "string",
    "orderStatusAction": "string",
    "revokeDescription": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "createPrescriptionOrderOrderStatusAction": {
          "type": "object",
          "properties": {
            "createTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767181574
                },
                "nanos": {
                  "type": "number",
                  "sample": 281906000
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "createUser": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                },
                "name": {
                  "type": "string",
                  "sample": "亀山　真一郎"
                },
                "namePhonetic": {
                  "type": "object",
                  "properties": {
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    },
                    "value": {
                      "type": "string",
                      "sample": "カメヤマ　シンイチロウ"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "doctor": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                },
                "name": {
                  "type": "string",
                  "sample": "亀山　真一郎"
                },
                "namePhonetic": {
                  "type": "object",
                  "properties": {
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    },
                    "value": {
                      "type": "string",
                      "sample": "カメヤマ　シンイチロウ"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "doctorUuid": {
              "type": "string",
              "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
            },
            "medicationCategory": {
              "type": "string",
              "sample": "MEDICATION_CATEGORY_ORDINARY"
            },
            "narcoticPractitioner": {
              "type": "null"
            },
            "narcoticPractitionerUuid": {
              "type": "null"
            },
            "note": {
              "type": "string",
              "sample": ""
            },
            "orderStatus": {
              "type": "string",
              "sample": "ORDER_STATUS_ACTIVE"
            },
            "patient": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
                },
                "serialNumber": {
                  "type": "string",
                  "sample": "00001"
                },
                "serialNumberPrefix": {
                  "type": "string",
                  "sample": ""
                },
                "fullName": {
                  "type": "string",
                  "sample": "テスト 1"
                },
                "fullNamePhonetic": {
                  "type": "string",
                  "sample": "テスト イチ"
                },
                "isDraft": {
                  "type": "boolean",
                  "sample": false
                },
                "isTestPatient": {
                  "type": "boolean",
                  "sample": true
                },
                "detail": {
                  "type": "object",
                  "properties": {
                    "patientUuid": {
                      "type": "string",
                      "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
                    },
                    "addressLine_1": {
                      "type": "string",
                      "sample": "香川県高松市テスト町"
                    },
                    "addressLine_2": {
                      "type": "string",
                      "sample": "てすとマンション"
                    },
                    "postalCode": {
                      "type": "string",
                      "sample": "123-4567"
                    },
                    "email": {
                      "type": "string",
                      "sample": "test1@test.com"
                    },
                    "phoneNumber": {
                      "type": "string",
                      "sample": "123456789"
                    },
                    "sexType": {
                      "type": "string",
                      "sample": "SEX_TYPE_MALE"
                    },
                    "birthDate": {
                      "type": "object",
                      "properties": {
                        "year": {
                          "type": "number",
                          "sample": 1975
                        },
                        "month": {
                          "type": "number",
                          "sample": 9
                        },
                        "day": {
                          "type": "number",
                          "sample": 18
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Date"
                        }
                      }
                    },
                    "memo": {
                      "type": "string",
                      "sample": "急変時は日赤に搬送希望あり"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "PatientDetail"
                    }
                  }
                },
                "tags": {
                  "type": "array",
                  "length": 2,
                  "items": [
                    {
                      "type": "string",
                      "sample": "test"
                    }
                  ]
                },
                "attentionSummary": {
                  "type": "object",
                  "properties": {
                    "hasAnyInfection": {
                      "type": "boolean",
                      "sample": false
                    },
                    "hasAnyAllergy": {
                      "type": "boolean",
                      "sample": false
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "PatientAttentionSummary"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "Patient"
                }
              }
            },
            "patientUuid": {
              "type": "string",
              "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
            },
            "revokeDescription": {
              "type": "string",
              "sample": ""
            },
            "rps": {
              "type": "array",
              "length": 1,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "medicationTiming": {
                      "type": "object",
                      "properties": {
                        "medicationTiming": {
                          "type": "object",
                          "properties": {
                            "canonicalPrescriptionUsage": {
                              "type": "object",
                              "properties": {
                                "uuid": {
                                  "type": "string",
                                  "sample": "0d7bc005-8b72-4dcf-9b83-a2fd24477458"
                                },
                                "text": {
                                  "type": "string",
                                  "sample": "１日１回朝食後"
                                },
                                "useAsNeeded": {
                                  "type": "boolean",
                                  "sample": false
                                },
                                "timings": {
                                  "type": "array",
                                  "length": 1,
                                  "items": [
                                    {
                                      "type": "max_depth"
                                    }
                                  ]
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "CanonicalPrescriptionUsage"
                                }
                              }
                            },
                            "canonicalPrescriptionUsageUuid": {
                              "type": "object",
                              "properties": {
                                "value": {
                                  "type": "string",
                                  "sample": "0d7bc005-8b72-4dcf-9b83-a2fd24477458"
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "StringValue"
                                }
                              }
                            },
                            "timesOfDay": {
                              "type": "null"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "MedicationTiming_medicationTiming"
                            }
                          }
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "MedicationTiming"
                        }
                      }
                    },
                    "slidingScaleEnabled": {
                      "type": "boolean",
                      "sample": false
                    },
                    "dosageText": {
                      "type": "string",
                      "sample": ""
                    },
                    "asNeeded": {
                      "type": "boolean",
                      "sample": false
                    },
                    "boundsDurationDays": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "number",
                          "sample": 7
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "UInt32Value"
                        }
                      }
                    },
                    "dosageFormType": {
                      "type": "number",
                      "sample": 1
                    },
                    "expectedRepeatCount": {
                      "type": "null"
                    },
                    "instructions": {
                      "type": "array",
                      "length": 1,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "instruction": {
                              "type": "object",
                              "properties": {
                                "equipmentInstruction": {
                                  "type": "null"
                                },
                                "medicationDosageInstruction": {
                                  "type": "object",
                                  "properties": {
                                    "isIngredientQuantity": {
                                      "type": "max_depth"
                                    },
                                    "localMedicine": {
                                      "type": "max_depth"
                                    },
                                    "localMedicineUuid": {
                                      "type": "max_depth"
                                    },
                                    "mhlwMedicine": {
                                      "type": "max_depth"
                                    },
                                    "mhlwMedicineId": {
                                      "type": "max_depth"
                                    },
                                    "quantity": {
                                      "type": "max_depth"
                                    },
                                    "receiptComments": {
                                      "type": "max_depth"
                                    },
                                    "uuid": {
                                      "type": "max_depth"
                                    },
                                    "isAccountingIgnored": {
                                      "type": "max_depth"
                                    },
                                    "showInPrescriptionRemarks": {
                                      "type": "max_depth"
                                    },
                                    "isGenericNameProhibited": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "PrescriptionOrderRp_Instruction_instruction"
                                }
                              }
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "PrescriptionOrderRp_Instruction"
                            }
                          }
                        }
                      ]
                    },
                    "isBringing": {
                      "type": "boolean",
                      "sample": false
                    },
                    "isWardStock": {
                      "type": "boolean",
                      "sample": false
                    },
                    "localInjectionTechnique": {
                      "type": "null"
                    },
                    "localInjectionTechniqueUuid": {
                      "type": "null"
                    },
                    "uuid": {
                      "type": "string",
                      "sample": "bffd06f6-28ba-44e1-8fe2-ac878248cc93"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "PrescriptionOrderRp"
                    }
                  }
                }
              ]
            },
            "startDate": {
              "type": "object",
              "properties": {
                "year": {
                  "type": "number",
                  "sample": 2025
                },
                "month": {
                  "type": "number",
                  "sample": 12
                },
                "day": {
                  "type": "number",
                  "sample": 31
                },
                "__typename": {
                  "type": "string",
                  "sample": "Date"
                }
              }
            },
            "updateTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767188039
                },
                "nanos": {
                  "type": "number",
                  "sample": 168409668
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "updateUser": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                },
                "name": {
                  "type": "string",
                  "sample": "亀山　真一郎"
                },
                "namePhonetic": {
                  "type": "object",
                  "properties": {
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    },
                    "value": {
                      "type": "string",
                      "sample": "カメヤマ　シンイチロウ"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "uuid": {
              "type": "string",
              "sample": "e498463d-3212-4c76-8042-febdc2095a5f"
            },
            "encounterId": {
              "type": "null"
            },
            "extendedInsuranceCombinationId": {
              "type": "null"
            },
            "isDraft": {
              "type": "boolean",
              "sample": false
            },
            "isOutpatient": {
              "type": "boolean",
              "sample": false
            },
            "__typename": {
              "type": "string",
              "sample": "PrescriptionOrder"
            }
          }
        }
      }
    }
  }
}
```

---

## CreateRehabilitationOrder

**Hash**: `3f79a26987dfaa3d497590e8a98aa0d8fcffe8b5065583a63620f30f45e7eac0`

### Variables

```json
{
  "input": {
    "uuid": "string",
    "patientUuid": "string",
    "doctorUuid": "string",
    "startDate": {
      "year": "number",
      "month": "number",
      "day": "number"
    },
    "endDate": {
      "year": "number",
      "month": "number",
      "day": "number"
    },
    "detail": {
      "uuid": "string",
      "patientReceiptDiseaseUuid": {
        "value": "string"
      },
      "therapyStartDate": {
        "year": "number",
        "month": "number",
        "day": "number"
      },
      "planEvaluationDate": "null",
      "complications": "string",
      "contraindications": "string",
      "objectiveNote": "string",
      "place": "string",
      "note": "string",
      "noteForPt": "string",
      "noteForOt": "string",
      "noteForSt": "string",
      "rehabilitationPlanUuids": [
        "string"
      ],
      "rehabilitationCalculationTypeUuid": {
        "value": "string"
      },
      "rehabilitationTherapyStartDateTypeUuid": {
        "value": "string"
      },
      "exclusionLimitDescription": "string",
      "exclusionLimitType": "string",
      "rehabilitationKasanStartDate": "null",
      "rehabilitationKasanStartDateTypeUuid": "null",
      "acuteDiseasePatientReceiptDiseaseUuid": "null",
      "acutePhaseRehabilitationTargetConditions": "[]"
    }
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "createRehabilitationOrder": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "37193e26-606b-4eb7-b30b-d83a991b2525"
            },
            "patientUuid": {
              "type": "string",
              "sample": "729bad57-c0d4-4d0c-b026-cd149f4137fb"
            },
            "patient": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "729bad57-c0d4-4d0c-b026-cd149f4137fb"
                },
                "__typename": {
                  "type": "string",
                  "sample": "Patient"
                }
              }
            },
            "doctorUuid": {
              "type": "string",
              "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
            },
            "orderStatus": {
              "type": "string",
              "sample": "ORDER_STATUS_ON_HOLD"
            },
            "startDate": {
              "type": "object",
              "properties": {
                "year": {
                  "type": "number",
                  "sample": 2025
                },
                "month": {
                  "type": "number",
                  "sample": 12
                },
                "day": {
                  "type": "number",
                  "sample": 31
                },
                "__typename": {
                  "type": "string",
                  "sample": "Date"
                }
              }
            },
            "endDate": {
              "type": "object",
              "properties": {
                "year": {
                  "type": "number",
                  "sample": 2026
                },
                "month": {
                  "type": "number",
                  "sample": 4
                },
                "day": {
                  "type": "number",
                  "sample": 29
                },
                "__typename": {
                  "type": "string",
                  "sample": "Date"
                }
              }
            },
            "prevEndDate": {
              "type": "null"
            },
            "stopConfirmed": {
              "type": "boolean",
              "sample": false
            },
            "createTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767188761
                },
                "nanos": {
                  "type": "number",
                  "sample": 803574479
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "updateTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767188761
                },
                "nanos": {
                  "type": "number",
                  "sample": 803574479
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "detail": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "37193e26-606b-4eb7-b30b-d83a991b2525"
                },
                "patientReceiptDiseaseUuid": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "type": "string",
                      "sample": "5a7d4ec3-862a-4aac-b641-915c019a182e"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    }
                  }
                },
                "therapyStartDate": {
                  "type": "object",
                  "properties": {
                    "year": {
                      "type": "number",
                      "sample": 2025
                    },
                    "month": {
                      "type": "number",
                      "sample": 12
                    },
                    "day": {
                      "type": "number",
                      "sample": 31
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "Date"
                    }
                  }
                },
                "planEvaluationDate": {
                  "type": "null"
                },
                "complications": {
                  "type": "string",
                  "sample": ""
                },
                "contraindications": {
                  "type": "string",
                  "sample": ""
                },
                "objectiveNote": {
                  "type": "string",
                  "sample": ""
                },
                "place": {
                  "type": "string",
                  "sample": ""
                },
                "note": {
                  "type": "string",
                  "sample": ""
                },
                "noteForPt": {
                  "type": "string",
                  "sample": ""
                },
                "noteForOt": {
                  "type": "string",
                  "sample": ""
                },
                "noteForSt": {
                  "type": "string",
                  "sample": ""
                },
                "rehabilitationPlanUuids": {
                  "type": "array",
                  "length": 1,
                  "items": [
                    {
                      "type": "string",
                      "sample": "fe938a3d-d775-48dd-87ce-aa693f5bec53"
                    }
                  ]
                },
                "rehabilitationCalculationTypeUuid": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "type": "string",
                      "sample": "10633142-8e7a-417e-9009-ff35b90036bb"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    }
                  }
                },
                "rehabilitationTherapyStartDateTypeUuid": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "type": "string",
                      "sample": "cbcb6ced-219e-4292-a7ca-de3bc23b5ba6"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    }
                  }
                },
                "rehabilitationKasanStartDateTypeUuid": {
                  "type": "null"
                },
                "rehabilitationKasanStartDate": {
                  "type": "null"
                },
                "exclusionLimitDescription": {
                  "type": "string",
                  "sample": ""
                },
                "exclusionLimitType": {
                  "type": "string",
                  "sample": "REHABILITATION_EXCLUSION_LIMIT_TYPE_NOT_APPLICABLE"
                },
                "acuteDiseasePatientReceiptDiseaseUuid": {
                  "type": "null"
                },
                "acutePhaseRehabilitationTargetConditions": {
                  "type": "array",
                  "items": "empty"
                },
                "patientReceiptDisease": {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "5a7d4ec3-862a-4aac-b641-915c019a182e"
                    },
                    "patientUuid": {
                      "type": "string",
                      "sample": "729bad57-c0d4-4d0c-b026-cd149f4137fb"
                    },
                    "masterDiseaseCode": {
                      "type": "string",
                      "sample": "8837291"
                    },
                    "masterModifierCodes": {
                      "type": "array",
                      "items": "empty"
                    },
                    "isMain": {
                      "type": "boolean",
                      "sample": true
                    },
                    "isSuspected": {
                      "type": "boolean",
                      "sample": false
                    },
                    "excludeReceipt": {
                      "type": "boolean",
                      "sample": false
                    },
                    "outcome": {
                      "type": "string",
                      "sample": "CONTINUED"
                    },
                    "startDate": {
                      "type": "object",
                      "properties": {
                        "year": {
                          "type": "number",
                          "sample": 2025
                        },
                        "month": {
                          "type": "number",
                          "sample": 5
                        },
                        "day": {
                          "type": "number",
                          "sample": 13
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Date"
                        }
                      }
                    },
                    "endDate": {
                      "type": "null"
                    },
                    "masterDisease": {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "sample": "8837291"
                        },
                        "name": {
                          "type": "string",
                          "sample": "大腿骨開放骨折"
                        },
                        "isModifierNeeded": {
                          "type": "boolean",
                          "sample": true
                        },
                        "icd10Code_1": {
                          "type": "object",
                          "properties": {
                            "value": {
                              "type": "string",
                              "sample": "S7291"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "StringValue"
                            }
                          }
                        },
                        "icd10Code_2": {
                          "type": "null"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "MasterDisease"
                        }
                      }
                    },
                    "masterModifiers": {
                      "type": "array",
                      "items": "empty"
                    },
                    "customDiseaseName": {
                      "type": "null"
                    },
                    "intractableDiseaseType": {
                      "type": "string",
                      "sample": "NOT_APPLICABLE"
                    },
                    "patientCareType": {
                      "type": "string",
                      "sample": "PATIENT_CARE_TYPE_ANY"
                    },
                    "isDraft": {
                      "type": "boolean",
                      "sample": false
                    },
                    "updateUser": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "c12e6584-c336-4edf-8468-be527ea43b33"
                        },
                        "name": {
                          "type": "string",
                          "sample": "ヘンリー従業員 (minoru.koike)"
                        },
                        "namePhonetic": {
                          "type": "object",
                          "properties": {
                            "__typename": {
                              "type": "string",
                              "sample": "StringValue"
                            },
                            "value": {
                              "type": "string",
                              "sample": "ヘンリージュウギョウイン"
                            }
                          }
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "User"
                        }
                      }
                    },
                    "createTime": {
                      "type": "object",
                      "properties": {
                        "seconds": {
                          "type": "number",
                          "sample": 1747120850
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 91176000
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Timestamp"
                        }
                      }
                    },
                    "updateTime": {
                      "type": "object",
                      "properties": {
                        "seconds": {
                          "type": "number",
                          "sample": 1747899967
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 184159000
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Timestamp"
                        }
                      }
                    },
                    "deleteTime": {
                      "type": "null"
                    },
                    "patient": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "729bad57-c0d4-4d0c-b026-cd149f4137fb"
                        },
                        "serialNumber": {
                          "type": "string",
                          "sample": "00011"
                        },
                        "serialNumberPrefix": {
                          "type": "string",
                          "sample": ""
                        },
                        "fullName": {
                          "type": "string",
                          "sample": "テスト 11"
                        },
                        "fullNamePhonetic": {
                          "type": "string",
                          "sample": "テスト ジュウイチ"
                        },
                        "isDraft": {
                          "type": "boolean",
                          "sample": false
                        },
                        "isTestPatient": {
                          "type": "boolean",
                          "sample": true
                        },
                        "detail": {
                          "type": "object",
                          "properties": {
                            "patientUuid": {
                              "type": "string",
                              "sample": "729bad57-c0d4-4d0c-b026-cd149f4137fb"
                            },
                            "addressLine_1": {
                              "type": "string",
                              "sample": "香川県高松市テスト町"
                            },
                            "addressLine_2": {
                              "type": "string",
                              "sample": "あああ"
                            },
                            "postalCode": {
                              "type": "string",
                              "sample": ""
                            },
                            "email": {
                              "type": "string",
                              "sample": ""
                            },
                            "phoneNumber": {
                              "type": "string",
                              "sample": "123"
                            },
                            "sexType": {
                              "type": "string",
                              "sample": "SEX_TYPE_FEMALE"
                            },
                            "birthDate": {
                              "type": "object",
                              "properties": {
                                "year": {
                                  "type": "number",
                                  "sample": 1949
                                },
                                "month": {
                                  "type": "number",
                                  "sample": 4
                                },
                                "day": {
                                  "type": "number",
                                  "sample": 6
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "Date"
                                }
                              }
                            },
                            "memo": {
                              "type": "string",
                              "sample": "採血"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "PatientDetail"
                            }
                          }
                        },
                        "tags": {
                          "type": "array",
                          "length": 2,
                          "items": [
                            {
                              "type": "string",
                              "sample": "佐藤Ns"
                            }
                          ]
                        },
                        "attentionSummary": {
                          "type": "object",
                          "properties": {
                            "hasAnyInfection": {
                              "type": "boolean",
                              "sample": false
                            },
                            "hasAnyAllergy": {
                              "type": "boolean",
                              "sample": false
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "PatientAttentionSummary"
                            }
                          }
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Patient"
                        }
                      }
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "PatientReceiptDisease"
                    }
                  }
                },
                "acuteDiseasePatientReceiptDisease": {
                  "type": "null"
                },
                "rehabilitationCalculationType": {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "10633142-8e7a-417e-9009-ff35b90036bb"
                    },
                    "name": {
                      "type": "string",
                      "sample": "廃用症候群リハビリテーション"
                    },
                    "period": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "number",
                          "sample": 120
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "UInt32Value"
                        }
                      }
                    },
                    "isShikkanbetsuRehabilitation": {
                      "type": "boolean",
                      "sample": true
                    },
                    "therapyStartDateTypes": {
                      "type": "array",
                      "length": 2,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "fc639bcd-a68b-4880-aa3b-1ca37ba2fbe4"
                            },
                            "name": {
                              "type": "string",
                              "sample": "廃用症候群の急性増悪日"
                            },
                            "rehabilitationCalculationTypeId": {
                              "type": "string",
                              "sample": "10633142-8e7a-417e-9009-ff35b90036bb"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "RehabilitationTherapyStartDateType"
                            }
                          }
                        }
                      ]
                    },
                    "rehabilitationKasanStartDateTypes": {
                      "type": "array",
                      "length": 4,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "4913c34f-f734-4eb2-b933-8875de4cf57f"
                            },
                            "rehabilitationCalculationTypeId": {
                              "type": "string",
                              "sample": "10633142-8e7a-417e-9009-ff35b90036bb"
                            },
                            "name": {
                              "type": "string",
                              "sample": "急性疾患等の発症日"
                            },
                            "needsAcuteDiseaseName": {
                              "type": "boolean",
                              "sample": true
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "RehabilitationKasanStartDateType"
                            }
                          }
                        }
                      ]
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "RehabilitationCalculationType"
                    }
                  }
                },
                "rehabilitationPlans": {
                  "type": "array",
                  "length": 1,
                  "items": [
                    {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "fe938a3d-d775-48dd-87ce-aa693f5bec53"
                        },
                        "category": {
                          "type": "string",
                          "sample": "PT"
                        },
                        "name": {
                          "type": "string",
                          "sample": "関節可動域訓練"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "RehabilitationPlan"
                        }
                      }
                    }
                  ]
                },
                "__typename": {
                  "type": "string",
                  "sample": "RehabilitationOrderDetail"
                }
              }
            },
            "atLeastOneExecuted": {
              "type": "boolean",
              "sample": false
            },
            "doctor": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                },
                "name": {
                  "type": "string",
                  "sample": "亀山　真一郎"
                },
                "namePhonetic": {
                  "type": "object",
                  "properties": {
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    },
                    "value": {
                      "type": "string",
                      "sample": "カメヤマ　シンイチロウ"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "createUser": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                },
                "name": {
                  "type": "string",
                  "sample": "亀山　真一郎"
                },
                "namePhonetic": {
                  "type": "object",
                  "properties": {
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    },
                    "value": {
                      "type": "string",
                      "sample": "カメヤマ　シンイチロウ"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "updateUser": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                },
                "name": {
                  "type": "string",
                  "sample": "亀山　真一郎"
                },
                "namePhonetic": {
                  "type": "object",
                  "properties": {
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    },
                    "value": {
                      "type": "string",
                      "sample": "カメヤマ　シンイチロウ"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "isDraft": {
              "type": "boolean",
              "sample": false
            },
            "isOutpatient": {
              "type": "boolean",
              "sample": true
            },
            "__typename": {
              "type": "string",
              "sample": "RehabilitationOrder"
            }
          }
        }
      }
    }
  }
}
```

---

## CreateRehabilitationOrderOrderStatusAction

**Hash**: `5dae97a95aac0cb6bf1cb5db8272e7367793ece520f62d83597cc06e5f04eec5`

### Variables

```json
{
  "input": {
    "uuid": "string",
    "orderStatusAction": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "createRehabilitationOrderOrderStatusAction": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "37193e26-606b-4eb7-b30b-d83a991b2525"
            },
            "patientUuid": {
              "type": "string",
              "sample": "729bad57-c0d4-4d0c-b026-cd149f4137fb"
            },
            "patient": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "729bad57-c0d4-4d0c-b026-cd149f4137fb"
                },
                "__typename": {
                  "type": "string",
                  "sample": "Patient"
                }
              }
            },
            "doctorUuid": {
              "type": "string",
              "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
            },
            "orderStatus": {
              "type": "string",
              "sample": "ORDER_STATUS_ACTIVE"
            },
            "startDate": {
              "type": "object",
              "properties": {
                "year": {
                  "type": "number",
                  "sample": 2025
                },
                "month": {
                  "type": "number",
                  "sample": 12
                },
                "day": {
                  "type": "number",
                  "sample": 31
                },
                "__typename": {
                  "type": "string",
                  "sample": "Date"
                }
              }
            },
            "endDate": {
              "type": "object",
              "properties": {
                "year": {
                  "type": "number",
                  "sample": 2026
                },
                "month": {
                  "type": "number",
                  "sample": 4
                },
                "day": {
                  "type": "number",
                  "sample": 29
                },
                "__typename": {
                  "type": "string",
                  "sample": "Date"
                }
              }
            },
            "prevEndDate": {
              "type": "null"
            },
            "stopConfirmed": {
              "type": "boolean",
              "sample": false
            },
            "createTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767188761
                },
                "nanos": {
                  "type": "number",
                  "sample": 803574000
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "updateTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767238775
                },
                "nanos": {
                  "type": "number",
                  "sample": 926418473
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "detail": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "37193e26-606b-4eb7-b30b-d83a991b2525"
                },
                "patientReceiptDiseaseUuid": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "type": "string",
                      "sample": "5a7d4ec3-862a-4aac-b641-915c019a182e"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    }
                  }
                },
                "therapyStartDate": {
                  "type": "object",
                  "properties": {
                    "year": {
                      "type": "number",
                      "sample": 2025
                    },
                    "month": {
                      "type": "number",
                      "sample": 12
                    },
                    "day": {
                      "type": "number",
                      "sample": 31
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "Date"
                    }
                  }
                },
                "planEvaluationDate": {
                  "type": "null"
                },
                "complications": {
                  "type": "string",
                  "sample": ""
                },
                "contraindications": {
                  "type": "string",
                  "sample": ""
                },
                "objectiveNote": {
                  "type": "string",
                  "sample": ""
                },
                "place": {
                  "type": "string",
                  "sample": ""
                },
                "note": {
                  "type": "string",
                  "sample": ""
                },
                "noteForPt": {
                  "type": "string",
                  "sample": ""
                },
                "noteForOt": {
                  "type": "string",
                  "sample": ""
                },
                "noteForSt": {
                  "type": "string",
                  "sample": ""
                },
                "rehabilitationPlanUuids": {
                  "type": "array",
                  "length": 1,
                  "items": [
                    {
                      "type": "string",
                      "sample": "fe938a3d-d775-48dd-87ce-aa693f5bec53"
                    }
                  ]
                },
                "rehabilitationCalculationTypeUuid": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "type": "string",
                      "sample": "10633142-8e7a-417e-9009-ff35b90036bb"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    }
                  }
                },
                "rehabilitationTherapyStartDateTypeUuid": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "type": "string",
                      "sample": "cbcb6ced-219e-4292-a7ca-de3bc23b5ba6"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    }
                  }
                },
                "rehabilitationKasanStartDateTypeUuid": {
                  "type": "null"
                },
                "rehabilitationKasanStartDate": {
                  "type": "null"
                },
                "exclusionLimitDescription": {
                  "type": "string",
                  "sample": ""
                },
                "exclusionLimitType": {
                  "type": "string",
                  "sample": "REHABILITATION_EXCLUSION_LIMIT_TYPE_NOT_APPLICABLE"
                },
                "acuteDiseasePatientReceiptDiseaseUuid": {
                  "type": "null"
                },
                "acutePhaseRehabilitationTargetConditions": {
                  "type": "array",
                  "items": "empty"
                },
                "patientReceiptDisease": {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "5a7d4ec3-862a-4aac-b641-915c019a182e"
                    },
                    "patientUuid": {
                      "type": "string",
                      "sample": "729bad57-c0d4-4d0c-b026-cd149f4137fb"
                    },
                    "masterDiseaseCode": {
                      "type": "string",
                      "sample": "8837291"
                    },
                    "masterModifierCodes": {
                      "type": "array",
                      "items": "empty"
                    },
                    "isMain": {
                      "type": "boolean",
                      "sample": true
                    },
                    "isSuspected": {
                      "type": "boolean",
                      "sample": false
                    },
                    "excludeReceipt": {
                      "type": "boolean",
                      "sample": false
                    },
                    "outcome": {
                      "type": "string",
                      "sample": "CONTINUED"
                    },
                    "startDate": {
                      "type": "object",
                      "properties": {
                        "year": {
                          "type": "number",
                          "sample": 2025
                        },
                        "month": {
                          "type": "number",
                          "sample": 5
                        },
                        "day": {
                          "type": "number",
                          "sample": 13
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Date"
                        }
                      }
                    },
                    "endDate": {
                      "type": "null"
                    },
                    "masterDisease": {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "sample": "8837291"
                        },
                        "name": {
                          "type": "string",
                          "sample": "大腿骨開放骨折"
                        },
                        "isModifierNeeded": {
                          "type": "boolean",
                          "sample": true
                        },
                        "icd10Code_1": {
                          "type": "object",
                          "properties": {
                            "value": {
                              "type": "string",
                              "sample": "S7291"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "StringValue"
                            }
                          }
                        },
                        "icd10Code_2": {
                          "type": "null"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "MasterDisease"
                        }
                      }
                    },
                    "masterModifiers": {
                      "type": "array",
                      "items": "empty"
                    },
                    "customDiseaseName": {
                      "type": "null"
                    },
                    "intractableDiseaseType": {
                      "type": "string",
                      "sample": "NOT_APPLICABLE"
                    },
                    "patientCareType": {
                      "type": "string",
                      "sample": "PATIENT_CARE_TYPE_ANY"
                    },
                    "isDraft": {
                      "type": "boolean",
                      "sample": false
                    },
                    "updateUser": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "c12e6584-c336-4edf-8468-be527ea43b33"
                        },
                        "name": {
                          "type": "string",
                          "sample": "ヘンリー従業員 (minoru.koike)"
                        },
                        "namePhonetic": {
                          "type": "object",
                          "properties": {
                            "__typename": {
                              "type": "string",
                              "sample": "StringValue"
                            },
                            "value": {
                              "type": "string",
                              "sample": "ヘンリージュウギョウイン"
                            }
                          }
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "User"
                        }
                      }
                    },
                    "createTime": {
                      "type": "object",
                      "properties": {
                        "seconds": {
                          "type": "number",
                          "sample": 1747120850
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 91176000
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Timestamp"
                        }
                      }
                    },
                    "updateTime": {
                      "type": "object",
                      "properties": {
                        "seconds": {
                          "type": "number",
                          "sample": 1747899967
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 184159000
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Timestamp"
                        }
                      }
                    },
                    "deleteTime": {
                      "type": "null"
                    },
                    "patient": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "729bad57-c0d4-4d0c-b026-cd149f4137fb"
                        },
                        "serialNumber": {
                          "type": "string",
                          "sample": "00011"
                        },
                        "serialNumberPrefix": {
                          "type": "string",
                          "sample": ""
                        },
                        "fullName": {
                          "type": "string",
                          "sample": "テスト 11"
                        },
                        "fullNamePhonetic": {
                          "type": "string",
                          "sample": "テスト ジュウイチ"
                        },
                        "isDraft": {
                          "type": "boolean",
                          "sample": false
                        },
                        "isTestPatient": {
                          "type": "boolean",
                          "sample": true
                        },
                        "detail": {
                          "type": "object",
                          "properties": {
                            "patientUuid": {
                              "type": "string",
                              "sample": "729bad57-c0d4-4d0c-b026-cd149f4137fb"
                            },
                            "addressLine_1": {
                              "type": "string",
                              "sample": "香川県高松市テスト町"
                            },
                            "addressLine_2": {
                              "type": "string",
                              "sample": "あああ"
                            },
                            "postalCode": {
                              "type": "string",
                              "sample": ""
                            },
                            "email": {
                              "type": "string",
                              "sample": ""
                            },
                            "phoneNumber": {
                              "type": "string",
                              "sample": "123"
                            },
                            "sexType": {
                              "type": "string",
                              "sample": "SEX_TYPE_FEMALE"
                            },
                            "birthDate": {
                              "type": "object",
                              "properties": {
                                "year": {
                                  "type": "number",
                                  "sample": 1949
                                },
                                "month": {
                                  "type": "number",
                                  "sample": 4
                                },
                                "day": {
                                  "type": "number",
                                  "sample": 6
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "Date"
                                }
                              }
                            },
                            "memo": {
                              "type": "string",
                              "sample": "採血"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "PatientDetail"
                            }
                          }
                        },
                        "tags": {
                          "type": "array",
                          "length": 2,
                          "items": [
                            {
                              "type": "string",
                              "sample": "佐藤Ns"
                            }
                          ]
                        },
                        "attentionSummary": {
                          "type": "object",
                          "properties": {
                            "hasAnyInfection": {
                              "type": "boolean",
                              "sample": false
                            },
                            "hasAnyAllergy": {
                              "type": "boolean",
                              "sample": false
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "PatientAttentionSummary"
                            }
                          }
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Patient"
                        }
                      }
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "PatientReceiptDisease"
                    }
                  }
                },
                "acuteDiseasePatientReceiptDisease": {
                  "type": "null"
                },
                "rehabilitationCalculationType": {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "10633142-8e7a-417e-9009-ff35b90036bb"
                    },
                    "name": {
                      "type": "string",
                      "sample": "廃用症候群リハビリテーション"
                    },
                    "period": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "number",
                          "sample": 120
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "UInt32Value"
                        }
                      }
                    },
                    "isShikkanbetsuRehabilitation": {
                      "type": "boolean",
                      "sample": true
                    },
                    "therapyStartDateTypes": {
                      "type": "array",
                      "length": 2,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "fc639bcd-a68b-4880-aa3b-1ca37ba2fbe4"
                            },
                            "name": {
                              "type": "string",
                              "sample": "廃用症候群の急性増悪日"
                            },
                            "rehabilitationCalculationTypeId": {
                              "type": "string",
                              "sample": "10633142-8e7a-417e-9009-ff35b90036bb"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "RehabilitationTherapyStartDateType"
                            }
                          }
                        }
                      ]
                    },
                    "rehabilitationKasanStartDateTypes": {
                      "type": "array",
                      "length": 4,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "4913c34f-f734-4eb2-b933-8875de4cf57f"
                            },
                            "rehabilitationCalculationTypeId": {
                              "type": "string",
                              "sample": "10633142-8e7a-417e-9009-ff35b90036bb"
                            },
                            "name": {
                              "type": "string",
                              "sample": "急性疾患等の発症日"
                            },
                            "needsAcuteDiseaseName": {
                              "type": "boolean",
                              "sample": true
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "RehabilitationKasanStartDateType"
                            }
                          }
                        }
                      ]
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "RehabilitationCalculationType"
                    }
                  }
                },
                "rehabilitationPlans": {
                  "type": "array",
                  "length": 1,
                  "items": [
                    {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "fe938a3d-d775-48dd-87ce-aa693f5bec53"
                        },
                        "category": {
                          "type": "string",
                          "sample": "PT"
                        },
                        "name": {
                          "type": "string",
                          "sample": "関節可動域訓練"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "RehabilitationPlan"
                        }
                      }
                    }
                  ]
                },
                "__typename": {
                  "type": "string",
                  "sample": "RehabilitationOrderDetail"
                }
              }
            },
            "atLeastOneExecuted": {
              "type": "boolean",
              "sample": false
            },
            "doctor": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                },
                "name": {
                  "type": "string",
                  "sample": "亀山　真一郎"
                },
                "namePhonetic": {
                  "type": "object",
                  "properties": {
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    },
                    "value": {
                      "type": "string",
                      "sample": "カメヤマ　シンイチロウ"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "createUser": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                },
                "name": {
                  "type": "string",
                  "sample": "亀山　真一郎"
                },
                "namePhonetic": {
                  "type": "object",
                  "properties": {
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    },
                    "value": {
                      "type": "string",
                      "sample": "カメヤマ　シンイチロウ"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "updateUser": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                },
                "name": {
                  "type": "string",
                  "sample": "亀山　真一郎"
                },
                "namePhonetic": {
                  "type": "object",
                  "properties": {
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    },
                    "value": {
                      "type": "string",
                      "sample": "カメヤマ　シンイチロウ"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "isDraft": {
              "type": "boolean",
              "sample": false
            },
            "isOutpatient": {
              "type": "boolean",
              "sample": true
            },
            "__typename": {
              "type": "string",
              "sample": "RehabilitationOrder"
            }
          }
        }
      }
    }
  }
}
```

---

## CreateSession

**Hash**: `522a869a101be6fe1d999aa8fac8395ec6b55414c4717dcfc9a31e24acbb4f08`

### Variables

```json
{
  "input": {
    "uuid": "string",
    "patientUuid": {
      "value": "string"
    },
    "doctorUuid": "string",
    "purposeOfVisitUuid": "string",
    "state": "string",
    "note": "string",
    "countedInConsultationDays": "boolean",
    "scheduleTime": {
      "seconds": "number",
      "nanos": "number"
    },
    "encounterId": {
      "value": "string"
    }
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "createSession": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "f2ecfd13-21a5-4f68-81e1-bf72b1c13508"
            },
            "patientUuid": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "960b76b7-8482-45fc-b148-1e9cbfc03d43"
                },
                "__typename": {
                  "type": "string",
                  "sample": "StringValue"
                }
              }
            },
            "doctorUuid": {
              "type": "string",
              "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
            },
            "purposeOfVisitUuid": {
              "type": "string",
              "sample": "acdfdb0a-b7d2-4fad-96d9-fc6bb96a8c77"
            },
            "latestConsultationModificationRequestUuid": {
              "type": "null"
            },
            "state": {
              "type": "string",
              "sample": "BEFORE_CONSULTATION"
            },
            "stateChangeTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767188574
                },
                "nanos": {
                  "type": "number",
                  "sample": 412831000
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "note": {
              "type": "string",
              "sample": ""
            },
            "countedInConsultationDays": {
              "type": "boolean",
              "sample": true
            },
            "scheduleTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767188562
                },
                "nanos": {
                  "type": "number",
                  "sample": 0
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "visitTime": {
              "type": "null"
            },
            "consultationStartTime": {
              "type": "null"
            },
            "consultationEndTime": {
              "type": "null"
            },
            "insuredConsultation": {
              "type": "null"
            },
            "uninsuredConsultation": {
              "type": "null"
            },
            "sessionInvoiceCreateTime": {
              "type": "null"
            },
            "deleteTime": {
              "type": "null"
            },
            "patient": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "960b76b7-8482-45fc-b148-1e9cbfc03d43"
                },
                "serialNumber": {
                  "type": "string",
                  "sample": "00010"
                },
                "serialNumberPrefix": {
                  "type": "string",
                  "sample": ""
                },
                "fullName": {
                  "type": "string",
                  "sample": "テスト 10 麻薬処方テスト用"
                },
                "fullNamePhonetic": {
                  "type": "string",
                  "sample": "テスト ジュウ"
                },
                "isDraft": {
                  "type": "boolean",
                  "sample": false
                },
                "isTestPatient": {
                  "type": "boolean",
                  "sample": true
                },
                "detail": {
                  "type": "object",
                  "properties": {
                    "patientUuid": {
                      "type": "string",
                      "sample": "960b76b7-8482-45fc-b148-1e9cbfc03d43"
                    },
                    "addressLine_1": {
                      "type": "string",
                      "sample": "香川県高松市香川町大野123-123"
                    },
                    "addressLine_2": {
                      "type": "string",
                      "sample": ""
                    },
                    "postalCode": {
                      "type": "string",
                      "sample": "761-1701"
                    },
                    "email": {
                      "type": "string",
                      "sample": ""
                    },
                    "phoneNumber": {
                      "type": "string",
                      "sample": "10101010"
                    },
                    "sexType": {
                      "type": "string",
                      "sample": "SEX_TYPE_MALE"
                    },
                    "birthDate": {
                      "type": "object",
                      "properties": {
                        "year": {
                          "type": "number",
                          "sample": 1930
                        },
                        "month": {
                          "type": "number",
                          "sample": 5
                        },
                        "day": {
                          "type": "number",
                          "sample": 13
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Date"
                        }
                      }
                    },
                    "memo": {
                      "type": "string",
                      "sample": "DNR"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "PatientDetail"
                    }
                  }
                },
                "tags": {
                  "type": "array",
                  "length": 3,
                  "items": [
                    {
                      "type": "string",
                      "sample": "西山Ns"
                    }
                  ]
                },
                "attentionSummary": {
                  "type": "object",
                  "properties": {
                    "hasAnyInfection": {
                      "type": "boolean",
                      "sample": false
                    },
                    "hasAnyAllergy": {
                      "type": "boolean",
                      "sample": false
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "PatientAttentionSummary"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "Patient"
                }
              }
            },
            "doctor": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                },
                "name": {
                  "type": "string",
                  "sample": "亀山　真一郎"
                },
                "namePhonetic": {
                  "type": "object",
                  "properties": {
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    },
                    "value": {
                      "type": "string",
                      "sample": "カメヤマ　シンイチロウ"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "purposeOfVisit": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "acdfdb0a-b7d2-4fad-96d9-fc6bb96a8c77"
                },
                "title": {
                  "type": "string",
                  "sample": "整形外科"
                },
                "isHouseCall": {
                  "type": "boolean",
                  "sample": false
                },
                "idealTimeframe": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "type": "number",
                      "sample": 30
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "UInt32Value"
                    }
                  }
                },
                "startDate": {
                  "type": "null"
                },
                "endDate": {
                  "type": "null"
                },
                "order": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "type": "number",
                      "sample": 1
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "UInt32Value"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "PurposeOfVisit"
                }
              }
            },
            "encounterId": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "b2ae5573-764d-4742-a06f-413fe0d5b9c5"
                },
                "__typename": {
                  "type": "string",
                  "sample": "StringValue"
                }
              }
            },
            "tmpEncounterEnabled": {
              "type": "boolean",
              "sample": true
            },
            "outpatientAccountingUuid": {
              "type": "null"
            },
            "encounterHasBeenPublished": {
              "type": "boolean",
              "sample": false
            },
            "__typename": {
              "type": "string",
              "sample": "Session"
            }
          }
        }
      }
    }
  }
}
```

---

## DefaultExtendedInsuranceCombination

**Hash**: `cffd9cf9528444784a7cd1f957b0258f7dd250a904ee90159d3d23a4c19e25b1`

### Variables

```json
{
  "input": {
    "patientId": "string",
    "scheduleDate": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "defaultExtendedInsuranceCombination": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "sample": "//master.henry-app.jp/insuranceCombination/ebda2a5..."
            },
            "displayName": {
              "type": "string",
              "sample": "生活保護"
            },
            "shortDisplayName": {
              "type": "string",
              "sample": "生活保護"
            },
            "healthInsuranceSystem": {
              "type": "null"
            },
            "publicSubsidySystem1": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string",
                  "sample": "e6c9e658-f1c9-4709-932b-dea6be976113"
                },
                "name": {
                  "type": "string",
                  "sample": "生活保護"
                },
                "shortName": {
                  "type": "string",
                  "sample": "生活保護"
                },
                "isKyotoHobetsu27JudoRoujinKenKan": {
                  "type": "boolean",
                  "sample": false
                },
                "__typename": {
                  "type": "string",
                  "sample": "PublicSubsidySystem"
                }
              }
            },
            "publicSubsidySystem2": {
              "type": "null"
            },
            "__typename": {
              "type": "string",
              "sample": "ExtendedInsuranceCombination"
            }
          }
        }
      }
    }
  }
}
```

---

## DeletePatientFile

**Hash**: `1fa5b6878de17cf5e81b9bb0c37e4b05645de5762b1c15166643e4c1e60eef21`

### Variables

```json
{
  "input": {
    "uuid": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "deletePatientFile": {
          "type": "boolean",
          "sample": true
        }
      }
    }
  }
}
```

---

## EncounterByOutpatientAccounting

**Hash**: `651dbd0e4ad389159e323ade8c79fde89cdf3008932ed839a678a2e7f96ac442`

### Variables

```json
{
  "outpatientAccountingId": "string"
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "encounterByOutpatientAccounting": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "sample": "f6cbc38f-eeae-4efc-903b-55b02ea0ab99"
            },
            "patientId": {
              "type": "string",
              "sample": "19779efe-e25a-444d-9440-2538cbfaca63"
            },
            "patient": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string",
                  "sample": "19779efe-e25a-444d-9440-2538cbfaca63"
                },
                "serialNumber": {
                  "type": "string",
                  "sample": "18125"
                },
                "fullName": {
                  "type": "string",
                  "sample": "植村 隆義"
                },
                "fullNamePhonetic": {
                  "type": "string",
                  "sample": "ウエムラ タカヨシ"
                },
                "sexType": {
                  "type": "string",
                  "sample": "MALE"
                },
                "birthDate": {
                  "type": "string",
                  "sample": "1951-05-23"
                },
                "__typename": {
                  "type": "string",
                  "sample": "Patient"
                }
              }
            },
            "basedOn": {
              "type": "array",
              "length": 1,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "2cd4de29-a76a-405a-907e-bfd2dfc52a20"
                    },
                    "purposeOfVisit": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string",
                          "sample": "acdfdb0a-b7d2-4fad-96d9-fc6bb96a8c77"
                        },
                        "title": {
                          "type": "string",
                          "sample": "整形外科"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "PurposeOfVisit"
                        }
                      }
                    },
                    "scheduleTime": {
                      "type": "string",
                      "sample": "2025-12-29T22:52:07Z"
                    },
                    "patientId": {
                      "type": "string",
                      "sample": "19779efe-e25a-444d-9440-2538cbfaca63"
                    },
                    "patient": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string",
                          "sample": "19779efe-e25a-444d-9440-2538cbfaca63"
                        },
                        "fullName": {
                          "type": "string",
                          "sample": "植村 隆義"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Patient"
                        }
                      }
                    },
                    "doctorId": {
                      "type": "string",
                      "sample": "5bbead66-558f-4382-a46d-140e9a304e4b"
                    },
                    "doctor": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string",
                          "sample": "5bbead66-558f-4382-a46d-140e9a304e4b"
                        },
                        "name": {
                          "type": "string",
                          "sample": "満岡 　弘巳"
                        },
                        "departmentName": {
                          "type": "string",
                          "sample": "整形外科"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "User"
                        }
                      }
                    },
                    "state": {
                      "type": "string",
                      "sample": "AFTER_PAYMENT"
                    },
                    "visitTime": {
                      "type": "string",
                      "sample": "2025-12-30T01:48:18.880345Z"
                    },
                    "deleteTime": {
                      "type": "null"
                    },
                    "outpatientAccounting": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string",
                          "sample": "21916fa6-e527-11f0-86c4-01d6be709867"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "OutpatientAccounting"
                        }
                      }
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "Session"
                    }
                  }
                }
              ]
            },
            "firstPublishTime": {
              "type": "string",
              "sample": "2025-12-28T22:52:20.898995Z"
            },
            "records": {
              "type": "array",
              "length": 3,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "id": {
                      "type": "string",
                      "sample": "e11a3e15-3be2-4508-8e00-9f2424f13ab0"
                    },
                    "encounterId": {
                      "type": "string",
                      "sample": "f6cbc38f-eeae-4efc-903b-55b02ea0ab99"
                    },
                    "isDraft": {
                      "type": "boolean",
                      "sample": false
                    },
                    "isApproved": {
                      "type": "boolean",
                      "sample": true
                    },
                    "isDeleted": {
                      "type": "boolean",
                      "sample": false
                    },
                    "version": {
                      "type": "number",
                      "sample": 1
                    },
                    "extendedInsuranceCombinationId": {
                      "type": "null"
                    },
                    "insuranceCombination": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "null"
                        },
                        "displayName": {
                          "type": "string",
                          "sample": "主保険"
                        },
                        "shortDisplayName": {
                          "type": "string",
                          "sample": "主保険"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "InsuranceCombination"
                        }
                      }
                    },
                    "updateTime": {
                      "type": "string",
                      "sample": "2025-12-30T02:25:07.980408Z"
                    },
                    "updateUser": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string",
                          "sample": "5bbead66-558f-4382-a46d-140e9a304e4b"
                        },
                        "name": {
                          "type": "string",
                          "sample": "満岡 　弘巳"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "User"
                        }
                      }
                    },
                    "createTime": {
                      "type": "string",
                      "sample": "2025-12-28T22:52:20.945095Z"
                    },
                    "createUser": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string",
                          "sample": "5bbead66-558f-4382-a46d-140e9a304e4b"
                        },
                        "name": {
                          "type": "string",
                          "sample": "満岡 　弘巳"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "User"
                        }
                      }
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "ProgressNote"
                    },
                    "title": {
                      "type": "string",
                      "sample": "外来診療録"
                    },
                    "editorData": {
                      "type": "string",
                      "sample": "{\"blocks\":[{\"key\":\"fafhn\",\"type\":\"unstyled\",\"text\"..."
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "Encounter"
            }
          }
        }
      }
    }
  }
}
```

---

## EncountersInPatient

**Hash**: `d791cda7cf4e27c427212bc064935e99529ace8e3ea94e47287a7fc949129abe`

### Variables

```json
{
  "type": "object",
  "properties": {
    "patientId": {
      "type": "string",
      "sample": "2bfecb0b-d770-4932-beb4-49c16e63ae8c"
    },
    "startDate": {
      "type": "null",
      "sample": null
    },
    "endDate": {
      "type": "null",
      "sample": null
    },
    "pageSize": {
      "type": "number",
      "sample": 5
    },
    "pageToken": {
      "type": "null",
      "sample": null
    }
  }
}
```

### Response Schema

```json

```

---

## EncounterTemplateFoldersQuery

**Hash**: `d8cdb1284fba81ef90e0dbe3f7f0992836223f28a0033ccd76366e0a1259ed03`

### Variables

```json
{
  "patientId": "null",
  "parentFolderId": "null",
  "searchDate": "string",
  "query": "string",
  "pageSize": "number",
  "pageToken": "null"
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "encounterTemplateFolders": {
          "type": "object",
          "properties": {
            "encounterTemplateFolders": {
              "type": "array",
              "length": 17,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "id": {
                      "type": "string",
                      "sample": "3a6b3edc-e0fb-425f-b867-10fbcb8fb60b"
                    },
                    "name": {
                      "type": "string",
                      "sample": "00.書類"
                    },
                    "numOfContents": {
                      "type": "number",
                      "sample": 4
                    },
                    "patient": {
                      "type": "null"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "EncounterTemplateFolder"
                    },
                    "parentFolder": {
                      "type": "null"
                    }
                  }
                }
              ]
            },
            "nextPageToken": {
              "type": "null"
            },
            "__typename": {
              "type": "string",
              "sample": "PagedEncounterTemplateFolderList"
            }
          }
        }
      }
    }
  }
}
```

---

## EncounterTemplatesQuery

**Hash**: `f972c41b99ddf65e6f79e0b349d4f78a8c4fb91e9a6f92262154d23fb469fa62`

### Variables

```json
{
  "patientId": "null",
  "parentFolderId": "null",
  "searchDate": "string",
  "query": "string",
  "pageSize": "number",
  "pageToken": "null"
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "encounterTemplates": {
          "type": "object",
          "properties": {
            "encounterTemplates": {
              "type": "array",
              "length": 3,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "id": {
                      "type": "string",
                      "sample": "ee48d6c4-c0db-4845-bf23-3572c2cc803e"
                    },
                    "startDate": {
                      "type": "string",
                      "sample": "2025-05-18"
                    },
                    "endDate": {
                      "type": "null"
                    },
                    "title": {
                      "type": "string",
                      "sample": "ザルトプロフェン・アシノン・湿布 "
                    },
                    "description": {
                      "type": "string",
                      "sample": ""
                    },
                    "folder": {
                      "type": "null"
                    },
                    "records": {
                      "type": "array",
                      "length": 2,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "id": {
                              "type": "string",
                              "sample": "55adc1f7-b212-4735-b694-dcb3714af6ab"
                            },
                            "encounterTemplateId": {
                              "type": "string",
                              "sample": "ee48d6c4-c0db-4845-bf23-3572c2cc803e"
                            },
                            "isDraft": {
                              "type": "boolean",
                              "sample": false
                            },
                            "isDeleted": {
                              "type": "boolean",
                              "sample": false
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "ProgressNoteTemplate"
                            },
                            "title": {
                              "type": "string",
                              "sample": "外来診療録"
                            },
                            "editorData": {
                              "type": "string",
                              "sample": "{\"blocks\":[{\"key\":\"eq0nq\",\"text\":\"\",\"type\":\"unstyl..."
                            }
                          }
                        }
                      ]
                    },
                    "isDraft": {
                      "type": "boolean",
                      "sample": true
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "EncounterTemplate"
                    }
                  }
                }
              ]
            },
            "nextPageToken": {
              "type": "null"
            },
            "__typename": {
              "type": "string",
              "sample": "PagedEncounterTemplateList"
            }
          }
        }
      }
    }
  }
}
```

---

## GetAccountingOrder

**Hash**: `e21e2f3318ad15f8aca29b3839babc47b6122f906adfaf3bd578ccdc4d7f6051`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "uuid": {
          "type": "string",
          "sample": "b08ba37f-21e6-4936-9ae0-2347cb9ef57b"
        },
        "includeDraft": {
          "type": "boolean",
          "sample": false
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## GetBiopsyInspectionOrder

**Hash**: `7a2a7392f93c34119141dd00b9b5aa886bbf50e9ec632d92a64f5f73d5633dcb`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "uuid": {
          "type": "string",
          "sample": "f38b055e-f58a-43ce-b0e7-ade6e0ac784b"
        },
        "includeDraft": {
          "type": "boolean",
          "sample": false
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## GetCalculationHistory

**Hash**: `1850c1bcaa079c32278e5afcb15205ed72d6e8c94cf1fcfb7eba3350aa943a62`

### Variables

```json
{
  "type": "object",
  "properties": {
    "patientId": {
      "type": "string",
      "sample": "2bfecb0b-d770-4932-beb4-49c16e63ae8c"
    },
    "filter": {
      "type": "object",
      "properties": {
        "query": {
          "type": "null",
          "sample": null
        }
      }
    },
    "order": {
      "type": "string",
      "sample": "CALCULATION_DATE_DESC"
    },
    "pageToken": {
      "type": "null",
      "sample": null
    }
  }
}
```

### Response Schema

```json

```

---

## GetClinicalCalendarView

**Hash**: `74f284465206f367c4c544c20b020204478fa075a1fd3cb1bf3fd266ced026e1`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "2bfecb0b-d770-4932-beb4-49c16e63ae8c"
        },
        "baseDate": {
          "type": "object",
          "properties": {
            "year": {
              "type": "number",
              "sample": 2025
            },
            "month": {
              "type": "number",
              "sample": 12
            },
            "day": {
              "type": "number",
              "sample": 31
            }
          }
        },
        "beforeDateSize": {
          "type": "number",
          "sample": 14
        },
        "afterDateSize": {
          "type": "number",
          "sample": 14
        },
        "clinicalResourceHrns": {
          "type": "array",
          "length": 4,
          "items": [
            {
              "type": "string",
              "sample": "//henry-app.jp/clinicalResource/customClinicalDocument/f639619a-6fdb-452a-a803-8d42cd50830d"
            }
          ]
        },
        "createUserUuids": {
          "type": "array",
          "length": 98,
          "items": [
            {
              "type": "string",
              "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
            }
          ]
        },
        "accountingOrderShinryoShikibetsus": {
          "type": "array",
          "length": 0,
          "items": "empty"
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## GetClinicalDocument

**Hash**: `55c6b8a226f7ba8a7dc70e66fe0a93bb194f4923863ad9efe4060210b1b0430f`

### Variables

```json
{
  "input": {
    "clinicalDocumentUuid": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "getClinicalDocument": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "416b95c4-0252-41c9-9ac4-3d456551bca6"
            },
            "hospitalizationUuid": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "7fed3631-0d9b-4f1e-a4e5-60cde1d21cfe"
                },
                "__typename": {
                  "type": "string",
                  "sample": "StringValue"
                }
              }
            },
            "patientUuid": {
              "type": "string",
              "sample": "5cb2ec51-3d68-4788-8775-eafff2a5429f"
            },
            "creatorUuid": {
              "type": "string",
              "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
            },
            "lastAuthorUuid": {
              "type": "string",
              "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
            },
            "editorData": {
              "type": "string",
              "sample": "{\n  \"blocks\": [\n    {\n      \"key\": \"e82n9\",\n      ..."
            },
            "type": {
              "type": "object",
              "properties": {
                "clinicalDocumentCustomTypeUuid": {
                  "type": "null"
                },
                "type": {
                  "type": "string",
                  "sample": "HOSPITALIZATION_CONSULTATION"
                },
                "excerptType": {
                  "type": "string",
                  "sample": "TRUNCATED"
                },
                "clinicalDocumentCustomType": {
                  "type": "null"
                },
                "__typename": {
                  "type": "string",
                  "sample": "ClinicalDocumentType"
                }
              }
            },
            "performTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767401460
                },
                "nanos": {
                  "type": "number",
                  "sample": 0
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "createTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767401580
                },
                "nanos": {
                  "type": "number",
                  "sample": 132264000
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "updateTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767401580
                },
                "nanos": {
                  "type": "number",
                  "sample": 132264000
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "patient": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "5cb2ec51-3d68-4788-8775-eafff2a5429f"
                },
                "serialNumber": {
                  "type": "string",
                  "sample": "19883"
                },
                "serialNumberPrefix": {
                  "type": "string",
                  "sample": ""
                },
                "fullName": {
                  "type": "string",
                  "sample": "北村 浩久"
                },
                "fullNamePhonetic": {
                  "type": "string",
                  "sample": "キタムラ ヒロヒサ"
                },
                "isDraft": {
                  "type": "boolean",
                  "sample": false
                },
                "isTestPatient": {
                  "type": "boolean",
                  "sample": false
                },
                "detail": {
                  "type": "object",
                  "properties": {
                    "patientUuid": {
                      "type": "string",
                      "sample": "5cb2ec51-3d68-4788-8775-eafff2a5429f"
                    },
                    "addressLine_1": {
                      "type": "string",
                      "sample": "香川県高松市木太町1734－7"
                    },
                    "addressLine_2": {
                      "type": "string",
                      "sample": ""
                    },
                    "postalCode": {
                      "type": "string",
                      "sample": "7600080"
                    },
                    "email": {
                      "type": "string",
                      "sample": ""
                    },
                    "phoneNumber": {
                      "type": "string",
                      "sample": "09013246216"
                    },
                    "sexType": {
                      "type": "string",
                      "sample": "SEX_TYPE_MALE"
                    },
                    "birthDate": {
                      "type": "object",
                      "properties": {
                        "year": {
                          "type": "number",
                          "sample": 1960
                        },
                        "month": {
                          "type": "number",
                          "sample": 3
                        },
                        "day": {
                          "type": "number",
                          "sample": 7
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Date"
                        }
                      }
                    },
                    "memo": {
                      "type": "string",
                      "sample": "急変時県立中央病院に搬送してほしい。高額療養0707 0708 0709   一包化 壱番町ドーム薬..."
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "PatientDetail"
                    }
                  }
                },
                "tags": {
                  "type": "array",
                  "length": 8,
                  "items": [
                    {
                      "type": "string",
                      "sample": "重度褥瘡処置は2026/1/18まで"
                    }
                  ]
                },
                "attentionSummary": {
                  "type": "object",
                  "properties": {
                    "hasAnyInfection": {
                      "type": "boolean",
                      "sample": false
                    },
                    "hasAnyAllergy": {
                      "type": "boolean",
                      "sample": false
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "PatientAttentionSummary"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "Patient"
                }
              }
            },
            "lastAuthor": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                },
                "name": {
                  "type": "string",
                  "sample": "亀山　真一郎"
                },
                "namePhonetic": {
                  "type": "object",
                  "properties": {
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    },
                    "value": {
                      "type": "string",
                      "sample": "カメヤマ　シンイチロウ"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "creator": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                },
                "name": {
                  "type": "string",
                  "sample": "亀山　真一郎"
                },
                "namePhonetic": {
                  "type": "object",
                  "properties": {
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    },
                    "value": {
                      "type": "string",
                      "sample": "カメヤマ　シンイチロウ"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "__typename": {
              "type": "string",
              "sample": "ClinicalDocument"
            }
          }
        }
      }
    }
  }
}
```

---

## GetFileUploadUrl

**Hash**: `e7f149b0bc7cc698008349211d3e2439d436d68f618288574ea8d4c7af7c1bf4`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "pathType": {
          "type": "string",
          "sample": "PATIENT_FILE"
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## GetFoodSupplyConfig

**Hash**: `9bb8f006b670de0dd0780569b2533afc8d15255e933a2b84dae4befe3c738263`

### Variables

```json
{}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "getFoodSupplyConfig": {
          "type": "object",
          "properties": {
            "oralDiet": {
              "type": "string",
              "sample": "SAME_FOR_ALL"
            },
            "supplement": {
              "type": "string",
              "sample": "SAME_FOR_ALL"
            },
            "enteralFormula": {
              "type": "string",
              "sample": "SAME_FOR_ALL"
            },
            "drink": {
              "type": "string",
              "sample": "SAME_FOR_ALL"
            },
            "__typename": {
              "type": "string",
              "sample": "FoodSupplyConfig"
            }
          }
        }
      }
    }
  }
}
```

---

## GetImagingOrder

**Hash**: `072a0ff9b698dcaf20360caa597e289b5626fef6c2dc893e7fde5b747d1f5dab`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "uuid": {
          "type": "string",
          "sample": "1495d08c-490c-4284-9dc9-d582413db9c5"
        },
        "includeDraft": {
          "type": "boolean",
          "sample": false
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## GetInjectionOrder

**Hash**: `f871d9514cd255aff666004e00117d52c1c94ab33048a5031c6dd0388d01a37b`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "uuid": {
          "type": "string",
          "sample": "00c2fb6e-0e18-4a4b-8f07-33ed9bd9a9a7"
        },
        "includeDraft": {
          "type": "boolean",
          "sample": false
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## GetNutritionOrder

**Hash**: `84caca458bad7ff144d3faab86a1d12c82a136d61303c742d23d71e32611a982`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "uuid": {
          "type": "string",
          "sample": "612da1ff-a920-4062-b052-c12562c02218"
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## GetOrderNotifiableViewAction

**Hash**: `f987a2d855c27ac08a78421fe2e7232be9845e596b9dbfd6c322a42f3f04f4a6`

### Variables

```json
{}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "getOrderNotifiableViewAction": {
          "type": "object",
          "properties": {
            "isNotificationVisible": {
              "type": "boolean",
              "sample": true
            },
            "isScheduledVisible": {
              "type": "boolean",
              "sample": true
            },
            "__typename": {
              "type": "string",
              "sample": "OrderNotifiableViewAction"
            }
          }
        }
      }
    }
  }
}
```

---

## GetOrganization

**Hash**: `08fa9c23c53e01bc7e8ea19c999c6166272995ee08384965b74327497722df9a`

### Variables

```json
{
  "type": "object",
  "properties": {}
}
```

### Response Schema

```json

```

---

## getOrganizationFeatureFlag

**Hash**: `7ba95846d22d0cca070c785c7831add43e0bbdc07ca06ef008d46b296725c7cb`

### Variables

```json
{
  "type": "object",
  "properties": {}
}
```

### Response Schema

```json

```

---

## GetOrganizationMembershipWithDetail

**Hash**: `864488cdf41f37976a3284884a47cef45ee88efcba218a87d96b33b8e42e2c0d`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "userUuid": {
          "type": "string",
          "sample": "2fbef2da-8d6b-416a-8773-b457aa693652"
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## GetOutpatientAccountingBilling

**Hash**: `4717ae37ce4d08c8d8e4a0996e2d3c9cdd826bf9258cf51c30963bd29c4c5cb5`

### Variables

```json
{
  "outpatientAccountingId": "string"
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "outpatientAccounting": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "sample": "21916fa6-e527-11f0-86c4-01d6be709867"
            },
            "billing": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string",
                  "sample": "49fa495d-e527-11f0-bbae-09cae673facd"
                },
                "currentInvoice": {
                  "type": "object",
                  "properties": {
                    "id": {
                      "type": "string",
                      "sample": "7255db97-e527-11f0-9704-5b5723f487bc"
                    },
                    "createTime": {
                      "type": "string",
                      "sample": "2025-12-30T02:30:03.483062Z"
                    },
                    "totalPatientBurden": {
                      "type": "number",
                      "sample": 0
                    },
                    "insuredHealthcareSystemConsultationPatientBurdenAmount": {
                      "type": "number",
                      "sample": 0
                    },
                    "selfPaidHealthcareSystemConsultationPatientBurdenAmount": {
                      "type": "null"
                    },
                    "taxedNonHealthcareSystemConsultationCanUseWithHealthcareSystemPatientBurdenAmount": {
                      "type": "null"
                    },
                    "taxedNonHealthcareSystemConsultationCannotUseWithHealthcareSystemPatientBurdenAmount": {
                      "type": "null"
                    },
                    "statementUrl": {
                      "type": "string",
                      "sample": "https://storage.googleapis.com/henry-files-product..."
                    },
                    "invoiceUrl": {
                      "type": "string",
                      "sample": "https://example.com"
                    },
                    "hasPreviousInvoice": {
                      "type": "boolean",
                      "sample": true
                    },
                    "discountRate": {
                      "type": "null"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "OutpatientAccountingInvoice"
                    }
                  }
                },
                "isConfirmed": {
                  "type": "boolean",
                  "sample": true
                },
                "isSettled": {
                  "type": "boolean",
                  "sample": true
                },
                "hasPayment": {
                  "type": "boolean",
                  "sample": true
                },
                "canDeleteInvoice": {
                  "type": "boolean",
                  "sample": false
                },
                "canCreateIgnoredDifference": {
                  "type": "boolean",
                  "sample": false
                },
                "canResetPayment": {
                  "type": "boolean",
                  "sample": true
                },
                "canDeleteIgnoredDifference": {
                  "type": "boolean",
                  "sample": false
                },
                "canViewInvoice": {
                  "type": "boolean",
                  "sample": false
                },
                "bulkSessionPaymentId": {
                  "type": "null"
                },
                "receiptUrl": {
                  "type": "string",
                  "sample": "https://example.com"
                },
                "totalReceiveAmount": {
                  "type": "number",
                  "sample": 0
                },
                "outstandingAmount": {
                  "type": "null"
                },
                "overpaidAmount": {
                  "type": "null"
                },
                "ignoredDifferenceAmount": {
                  "type": "null"
                },
                "__typename": {
                  "type": "string",
                  "sample": "OutpatientAccountingBilling"
                }
              }
            },
            "__typename": {
              "type": "string",
              "sample": "OutpatientAccounting"
            }
          }
        }
      }
    }
  }
}
```

---

## GetPatient

**Hash**: `f6576921f637b4a2d3366fa1c7d950b0e522f6e5c2ad7191c550f03d3bf3da8d`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "uuid": {
          "type": "string",
          "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## GetPatientDocumentTemplate

**Hash**: `2e8d4bf116c07239ae42d35da28f895183f980ba9b411dbcca6a18e49d0013d1`

### Variables

```json
{
  "input": {
    "patientDocumentTemplateUuid": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "getPatientDocumentTemplate": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "310e6714-3101-490b-a32f-6394bf86c02e"
            },
            "title": {
              "type": "string",
              "sample": "01医師＞介護保険主治医意見書"
            },
            "description": {
              "type": "string",
              "sample": ""
            },
            "fileType": {
              "type": "string",
              "sample": "FILE_TYPE_DOCX"
            },
            "fileUrl": {
              "type": "string",
              "sample": "https://storage.googleapis.com/henry-files-product..."
            },
            "customPlaceholders": {
              "type": "array",
              "items": "empty"
            },
            "__typename": {
              "type": "string",
              "sample": "PatientDocumentTemplate"
            }
          }
        }
      }
    }
  }
}
```

---

## GetPrescriptionOrder

**Hash**: `d04340f8cb0ff73364238ac063610d595eeaecf700af53e3b4c5ac4732fcef71`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "uuid": {
          "type": "string",
          "sample": "e498463d-3212-4c76-8042-febdc2095a5f"
        },
        "includeDraft": {
          "type": "boolean",
          "sample": false
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## GetRehabilitationOrder

**Hash**: `e793ce0f03e19a13fca0fb3db4457ffdbf7d267d6fc59e21692a2a443668b07b`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "uuid": {
          "type": "string",
          "sample": "dff1628d-8bb3-4ad7-a98c-6becb1c6d169"
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## GetSession

**Hash**: `7ffac1e2e9b56a996ded148a1d7ac6a65a0dfdc911f49348efa2a3386cae53d3`

### Variables

```json
{
  "input": {
    "uuid": "string",
    "includeDraft": "boolean"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "getSession": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "2cd4de29-a76a-405a-907e-bfd2dfc52a20"
            },
            "patientUuid": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "19779efe-e25a-444d-9440-2538cbfaca63"
                },
                "__typename": {
                  "type": "string",
                  "sample": "StringValue"
                }
              }
            },
            "doctorUuid": {
              "type": "string",
              "sample": "5bbead66-558f-4382-a46d-140e9a304e4b"
            },
            "purposeOfVisitUuid": {
              "type": "string",
              "sample": "acdfdb0a-b7d2-4fad-96d9-fc6bb96a8c77"
            },
            "latestConsultationModificationRequestUuid": {
              "type": "null"
            },
            "state": {
              "type": "string",
              "sample": "AFTER_PAYMENT"
            },
            "stateChangeTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767061803
                },
                "nanos": {
                  "type": "number",
                  "sample": 564508000
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "note": {
              "type": "string",
              "sample": ""
            },
            "countedInConsultationDays": {
              "type": "boolean",
              "sample": true
            },
            "scheduleTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767048727
                },
                "nanos": {
                  "type": "number",
                  "sample": 0
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "visitTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767059298
                },
                "nanos": {
                  "type": "number",
                  "sample": 880345000
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "consultationStartTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767059298
                },
                "nanos": {
                  "type": "number",
                  "sample": 880345000
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "consultationEndTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767059298
                },
                "nanos": {
                  "type": "number",
                  "sample": 880345000
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "insuredConsultation": {
              "type": "null"
            },
            "uninsuredConsultation": {
              "type": "null"
            },
            "sessionInvoiceCreateTime": {
              "type": "null"
            },
            "deleteTime": {
              "type": "null"
            },
            "patient": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "19779efe-e25a-444d-9440-2538cbfaca63"
                },
                "serialNumber": {
                  "type": "string",
                  "sample": "18125"
                },
                "serialNumberPrefix": {
                  "type": "string",
                  "sample": ""
                },
                "fullName": {
                  "type": "string",
                  "sample": "植村 隆義"
                },
                "fullNamePhonetic": {
                  "type": "string",
                  "sample": "ウエムラ タカヨシ"
                },
                "isDraft": {
                  "type": "boolean",
                  "sample": false
                },
                "isTestPatient": {
                  "type": "boolean",
                  "sample": false
                },
                "detail": {
                  "type": "object",
                  "properties": {
                    "patientUuid": {
                      "type": "string",
                      "sample": "19779efe-e25a-444d-9440-2538cbfaca63"
                    },
                    "addressLine_1": {
                      "type": "string",
                      "sample": "高松市藤塚町2丁目11-20 藤塚コーポラス307号"
                    },
                    "addressLine_2": {
                      "type": "string",
                      "sample": ""
                    },
                    "postalCode": {
                      "type": "string",
                      "sample": "760-0071"
                    },
                    "email": {
                      "type": "string",
                      "sample": ""
                    },
                    "phoneNumber": {
                      "type": "string",
                      "sample": "08062889113"
                    },
                    "sexType": {
                      "type": "string",
                      "sample": "SEX_TYPE_MALE"
                    },
                    "birthDate": {
                      "type": "object",
                      "properties": {
                        "year": {
                          "type": "number",
                          "sample": 1951
                        },
                        "month": {
                          "type": "number",
                          "sample": 5
                        },
                        "day": {
                          "type": "number",
                          "sample": 23
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Date"
                        }
                      }
                    },
                    "memo": {
                      "type": "string",
                      "sample": "医療情報取得加算(再)07年12月\n忘れ物あり"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "PatientDetail"
                    }
                  }
                },
                "tags": {
                  "type": "array",
                  "length": 4,
                  "items": [
                    {
                      "type": "string",
                      "sample": "護送 "
                    }
                  ]
                },
                "attentionSummary": {
                  "type": "object",
                  "properties": {
                    "hasAnyInfection": {
                      "type": "boolean",
                      "sample": false
                    },
                    "hasAnyAllergy": {
                      "type": "boolean",
                      "sample": false
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "PatientAttentionSummary"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "Patient"
                }
              }
            },
            "doctor": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "5bbead66-558f-4382-a46d-140e9a304e4b"
                },
                "name": {
                  "type": "string",
                  "sample": "満岡 　弘巳"
                },
                "namePhonetic": {
                  "type": "object",
                  "properties": {
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    },
                    "value": {
                      "type": "string",
                      "sample": "マオカ ヒロミ"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "purposeOfVisit": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "acdfdb0a-b7d2-4fad-96d9-fc6bb96a8c77"
                },
                "title": {
                  "type": "string",
                  "sample": "整形外科"
                },
                "isHouseCall": {
                  "type": "boolean",
                  "sample": false
                },
                "idealTimeframe": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "type": "number",
                      "sample": 30
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "UInt32Value"
                    }
                  }
                },
                "startDate": {
                  "type": "null"
                },
                "endDate": {
                  "type": "null"
                },
                "order": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "type": "number",
                      "sample": 1
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "UInt32Value"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "PurposeOfVisit"
                }
              }
            },
            "encounterId": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "f6cbc38f-eeae-4efc-903b-55b02ea0ab99"
                },
                "__typename": {
                  "type": "string",
                  "sample": "StringValue"
                }
              }
            },
            "tmpEncounterEnabled": {
              "type": "boolean",
              "sample": true
            },
            "outpatientAccountingUuid": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "21916fa6-e527-11f0-86c4-01d6be709867"
                },
                "__typename": {
                  "type": "string",
                  "sample": "StringValue"
                }
              }
            },
            "encounterHasBeenPublished": {
              "type": "boolean",
              "sample": true
            },
            "__typename": {
              "type": "string",
              "sample": "Session"
            }
          }
        }
      }
    }
  }
}
```

---

## GetSpecimenInspectionOrder

**Hash**: `160c39ecd493f1f27435b6fdd72c99f0dedfe29dc860c70f5869b6e5ae0c461f`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "uuid": {
          "type": "string",
          "sample": "b20449a2-c24f-45e0-ab37-1536860da48f"
        },
        "includeDraft": {
          "type": "boolean",
          "sample": false
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## InjectionOrder

**Hash**: `252fb5224e86587eaf9cc17cb752044ed523bc8a23d0959affceeb4157915e6a`

### Variables

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "sample": "014a9859-e7bf-4bf1-92ed-a6808167ec7f"
    },
    "includeDraft": {
      "type": "boolean",
      "sample": false
    }
  }
}
```

### Response Schema

```json

```

---

## injectionOrderHistories

**Hash**: `0f1ca9cd988e273630bb9dfef84b20d12bc2f52932be23f05080bf6febecb5e4`

### Variables

```json
{
  "type": "object",
  "properties": {
    "injectionOrderId": {
      "type": "string",
      "sample": "014a9859-e7bf-4bf1-92ed-a6808167ec7f"
    }
  }
}
```

### Response Schema

```json

```

---

## latestApprovedInjectionOrderHistoriesExcludingCurrent

**Hash**: `e467c66e59caa7e37b508201ebcf5c13de3c1b26baf750e236722b304a135a43`

### Variables

```json
{
  "type": "object",
  "properties": {
    "injectionOrderIds": {
      "type": "array",
      "length": 1,
      "items": [
        {
          "type": "string",
          "sample": "014a9859-e7bf-4bf1-92ed-a6808167ec7f"
        }
      ]
    }
  }
}
```

### Response Schema

```json

```

---

## ListActiveNursingPlans

**Hash**: `3e99b47f6558f69eba009b96ee4beff5797c8d0b6e420a3c4014b227dc4ed5ca`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        },
        "pageSize": {
          "type": "number",
          "sample": 100
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListAllPatientAttentions

**Hash**: `50572e45d6c3901321848be2600a135cf146efde4ad1d258f0ec724c627c49f2`

### Variables

```json
{
  "type": "object",
  "properties": {
    "infectionInput": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "2bfecb0b-d770-4932-beb4-49c16e63ae8c"
        },
        "pageSize": {
          "type": "number",
          "sample": 100
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        }
      }
    },
    "foodAllergyInput": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "2bfecb0b-d770-4932-beb4-49c16e63ae8c"
        },
        "pageSize": {
          "type": "number",
          "sample": 100
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        }
      }
    },
    "otherAllergyInput": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "2bfecb0b-d770-4932-beb4-49c16e63ae8c"
        },
        "pageSize": {
          "type": "number",
          "sample": 100
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListAllPatientAttentionsV2

**Hash**: `04d2ee9ed03a528bbaebe1b29c99d6caf64adfc1aa3b81a6b60a64697ad5987f`

### Variables

```json
{
  "type": "object",
  "properties": {
    "drugAllergyInput": {
      "type": "object",
      "properties": {
        "patientId": {
          "type": "string",
          "sample": "2bfecb0b-d770-4932-beb4-49c16e63ae8c"
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListAllRehabilitationCalculationTypes

**Hash**: `a6f720ce3344d22fa56fac71cead3b4b089ccb16ecf94d6886d179b4fb98b631`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "searchDate": {
          "type": "object",
          "properties": {
            "year": {
              "type": "number",
              "sample": 2025
            },
            "month": {
              "type": "number",
              "sample": 12
            },
            "day": {
              "type": "number",
              "sample": 31
            }
          }
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListAvailableMhlwDefinitions

**Hash**: `b6142b0fb88f42df7b4b31b25abebc840884e94e6642653b69fab701449028f9`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "definitions": {
          "type": "array",
          "length": 1,
          "items": [
            {
              "type": "object",
              "properties": {
                "boundsDurationDays": {
                  "type": "number",
                  "sample": 1
                },
                "mhlwCommentCodes": {
                  "type": "array",
                  "length": 0,
                  "items": "empty"
                },
                "mhlwDiagnosisCodes": {
                  "type": "array",
                  "length": 0,
                  "items": "empty"
                },
                "mhlwEquipmentCodes": {
                  "type": "array",
                  "length": 0,
                  "items": "empty"
                },
                "mhlwMedicineCodes": {
                  "type": "array",
                  "length": 1,
                  "items": [
                    {
                      "type": "string",
                      "sample": "622411001"
                    }
                  ]
                },
                "mhlwModifierCodes": {
                  "type": "array",
                  "length": 0,
                  "items": "empty"
                }
              }
            }
          ]
        },
        "startDate": {
          "type": "object",
          "properties": {
            "year": {
              "type": "number",
              "sample": 2025
            },
            "month": {
              "type": "number",
              "sample": 12
            },
            "day": {
              "type": "number",
              "sample": 31
            }
          }
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListAvailablePatientInsuranceCombinations

**Hash**: `e9c53f39ead6f05bb3e9143b3e975ea6099ad9fa63adcce52dcc4211bd1a6f22`

### Variables

```json
{
  "input": {
    "patientUuid": "string",
    "searchDate": {
      "year": "number",
      "month": "number",
      "day": "number"
    }
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listAvailablePatientInsuranceCombinations": {
          "type": "object",
          "properties": {
            "insuranceCombinations": {
              "type": "array",
              "length": 1,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "ebda2a52-5dd4-4894-a96f-e292e56c5c5d"
                    },
                    "healthInsuranceSystemUuid": {
                      "type": "null"
                    },
                    "publicSubsidySystemUuid_1": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "string",
                          "sample": "e6c9e658-f1c9-4709-932b-dea6be976113"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "StringValue"
                        }
                      }
                    },
                    "publicSubsidySystemUuid_2": {
                      "type": "null"
                    },
                    "displayName": {
                      "type": "string",
                      "sample": "生活保護"
                    },
                    "shortDisplayName": {
                      "type": "string",
                      "sample": "生活保護"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "InsuranceCombination"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListAvailablePatientInsuranceCombinationsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListBiopsyInspectionOrderHistories

**Hash**: `d31e6f7ae3e957577ba1a2c1248c552519e1bb9d9badd598bfd7264c982ed0c1`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "biopsyInspectionOrderUuid": {
          "type": "string",
          "sample": "f38b055e-f58a-43ce-b0e7-ade6e0ac784b"
        },
        "pageSize": {
          "type": "number",
          "sample": 100
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListBiopsyInspections

**Hash**: `b425f1d02cdba246a4caad5dbd062982bb6bd511f42b5f318c54c203b3ee4dd0`

### Variables

```json
{
  "input": {
    "query": "string",
    "isOutpatient": "boolean"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listBiopsyInspections": {
          "type": "object",
          "properties": {
            "biopsyInspections": {
              "type": "array",
              "length": 3,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "ae76defa-d9d2-4ff6-bf5e-88cf33b707bf"
                    },
                    "name": {
                      "type": "string",
                      "sample": "生体検査"
                    },
                    "outsideInspectionLaboratory": {
                      "type": "null"
                    },
                    "outsideInspectionLaboratoryUuid": {
                      "type": "null"
                    },
                    "codeTableItems": {
                      "type": "array",
                      "length": 144,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "codeTableItemAlphabet": {
                              "type": "string",
                              "sample": "D"
                            },
                            "codeTableItemSectionNumber": {
                              "type": "number",
                              "sample": 200
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "CodeTableItem"
                            }
                          }
                        }
                      ]
                    },
                    "searchCategories": {
                      "type": "array",
                      "items": "empty"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "BiopsyInspection"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListBiopsyInspectionsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListClinicalDocumentCustomTypes

**Hash**: `a3a0f2bd53338b18565826319a3f1a0b2e385b2cf372480af5de8f1b1254c22d`

### Variables

```json
{
  "type": "object",
  "properties": {}
}
```

### Response Schema

```json

```

---

## ListClinicalDocuments

**Hash**: `1c4cab71733c192c3143f4c25e6040eb6df6d87fc6cda513f6566a75da7d7df0`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        },
        "pageSize": {
          "type": "number",
          "sample": 50
        },
        "clinicalDocumentTypes": {
          "type": "array",
          "length": 1,
          "items": [
            {
              "type": "object",
              "properties": {
                "type": {
                  "type": "string",
                  "sample": "HOSPITALIZATION_CONSULTATION"
                }
              }
            }
          ]
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListClinicalQuantitativeDataDefs

**Hash**: `f64f425eb240e7d3cceba86e42188e6c502503e4fbec9072723bd2b55591f957`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListComments

**Hash**: `d249dc36477f4f23865b1bfe5985425945b48b422b98cf56735ee4b205705c64`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "searchDate": {
          "type": "object",
          "properties": {
            "year": {
              "type": "number",
              "sample": 2025
            },
            "month": {
              "type": "number",
              "sample": 12
            },
            "day": {
              "type": "number",
              "sample": 28
            }
          }
        },
        "searchDateFilterType": {
          "type": "string",
          "sample": "IS_VALID_AT_DATE"
        },
        "codes": {
          "type": "array",
          "length": 1,
          "items": [
            {
              "type": "string",
              "sample": "850100186"
            }
          ]
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListDailyWardHospitalizations

**Hash**: `e1692624de62dd647f1e30bbeb9d468a67b777510710c474fb99f9a5b52ee02f`

### Variables

```json
{
  "input": {
    "searchText": "string",
    "doctorUuid": {
      "value": "string"
    },
    "roomIds": "[]",
    "searchDate": {
      "year": "number",
      "month": "number",
      "day": "number"
    },
    "wardIds": "[]"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listDailyWardHospitalizations": {
          "type": "object",
          "properties": {
            "dailyWardHospitalizations": {
              "type": "array",
              "length": 1,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "wardId": {
                      "type": "string",
                      "sample": "e7c51602-9d76-4800-a2ee-02b5d50d51fd"
                    },
                    "roomHospitalizationDistributions": {
                      "type": "array",
                      "length": 1,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "roomId": {
                              "type": "string",
                              "sample": "ddb9b096-7051-4148-a252-838561c590c1"
                            },
                            "hospitalizations": {
                              "type": "array",
                              "length": 1,
                              "items": [
                                {
                                  "type": "object",
                                  "properties": {
                                    "uuid": {
                                      "type": "max_depth"
                                    },
                                    "state": {
                                      "type": "max_depth"
                                    },
                                    "departmentTransferType": {
                                      "type": "max_depth"
                                    },
                                    "routeType": {
                                      "type": "max_depth"
                                    },
                                    "referralType": {
                                      "type": "max_depth"
                                    },
                                    "startDate": {
                                      "type": "max_depth"
                                    },
                                    "endDate": {
                                      "type": "max_depth"
                                    },
                                    "patient": {
                                      "type": "max_depth"
                                    },
                                    "hospitalizationDoctor": {
                                      "type": "max_depth"
                                    },
                                    "hospitalizationDayCount": {
                                      "type": "max_depth"
                                    },
                                    "lastHospitalizationLocationUuid": {
                                      "type": "max_depth"
                                    },
                                    "statusHospitalizationLocation": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                }
                              ]
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "DailyRoomHospitalizations"
                            }
                          }
                        }
                      ]
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "DailyWardHospitalizations"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListDailyWardHospitalizationsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListDepartments

**Hash**: `9086734b9565f1e004e51ab376922fcdd25a0e1f36191b8a7012ae0246a50098`

### Variables

```json
{}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listDepartments": {
          "type": "object",
          "properties": {
            "departments": {
              "type": "array",
              "length": 2,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "bc182da1-b2b0-4645-873a-1932eeccdb97"
                    },
                    "name": {
                      "type": "string",
                      "sample": "内科"
                    },
                    "receiptDepartmentCode": {
                      "type": "string",
                      "sample": "01"
                    },
                    "ff1DepartmentCode": {
                      "type": "string",
                      "sample": "010"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "Department"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListDepartmentsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListDiagnoses

**Hash**: `332917d68be9b0dea99a993af3c268f168097a3fc071ee983e65568556593b94`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "searchDate": {
          "type": "object",
          "properties": {
            "year": {
              "type": "number",
              "sample": 2025
            },
            "month": {
              "type": "number",
              "sample": 12
            },
            "day": {
              "type": "number",
              "sample": 28
            }
          }
        },
        "searchDateFilterType": {
          "type": "string",
          "sample": "IS_VALID_AT_DATE"
        },
        "codes": {
          "type": "array",
          "length": 1,
          "items": [
            {
              "type": "string",
              "sample": "160102510"
            }
          ]
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListDietaryRegimens

**Hash**: `e49806fcf4fc4f34d8d01fc1e7516c0508afb664624fbd290fedaf44befe1c39`

### Variables

```json
{}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listDietaryRegimens": {
          "type": "array",
          "length": 27,
          "items": [
            {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "8f818c71-36de-4b6b-aedd-1d70404f7669"
                },
                "name": {
                  "type": "string",
                  "sample": "常食"
                },
                "order": {
                  "type": "number",
                  "sample": 1
                },
                "obsoleteTime": {
                  "type": "null"
                },
                "__typename": {
                  "type": "string",
                  "sample": "DietaryRegimen"
                }
              }
            }
          ]
        }
      }
    }
  }
}
```

---

## ListEndedNursingPlans

**Hash**: `12fdcb6d5edfa5351b38a5e576f86fab5e454978368f08c2cc4c258a758c2c88`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        },
        "pageSize": {
          "type": "number",
          "sample": 10000
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListFeatureFlags

**Hash**: `4b0c683c6586669a1a9903a38083ebc4f1f4a336c86f55428709664763a0805b`

### Variables

```json
{
  "type": "object",
  "properties": {}
}
```

### Response Schema

```json

```

---

## ListFf1RecordSlots

**Hash**: `895fe9ac2414c4beaf52f3c5ccd49205cddd094f4f2db96e0afabbe23d9463ed`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "2bfecb0b-d770-4932-beb4-49c16e63ae8c"
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListFood

**Hash**: `f0ca1d29ed04c82826ea3c432850fa28a089284b80c5fa93f3e24fcdcbf94230`

### Variables

```json
{}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listFood": {
          "type": "array",
          "length": 41,
          "items": [
            {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "154437c4-d661-46a3-a4b4-2c44849156c2"
                },
                "name": {
                  "type": "string",
                  "sample": "りんごジュース"
                },
                "type": {
                  "type": "string",
                  "sample": "FOOD_TYPE_DRINK"
                },
                "quantityUnit": {
                  "type": "string",
                  "sample": "FOOD_QUANTITY_UNIT_PROPORTION"
                },
                "quantityOptions": {
                  "type": "array",
                  "length": 2,
                  "items": [
                    {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "45517bf6-2607-4bfb-a09c-e70e27340f4b"
                        },
                        "displayName": {
                          "type": "string",
                          "sample": "あり"
                        },
                        "quantityPercentage": {
                          "type": "number",
                          "sample": 100
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "FoodQuantityOption"
                        }
                      }
                    }
                  ]
                },
                "costCalculationEnabled": {
                  "type": "boolean",
                  "sample": true
                },
                "obsoleteTime": {
                  "type": "null"
                },
                "__typename": {
                  "type": "string",
                  "sample": "Food"
                }
              }
            }
          ]
        }
      }
    }
  }
}
```

---

## ListHospitalizationAccountingSummaries

**Hash**: `1b8eae4ab9e33c3530d975ccbbbc0fbf83e1b2ca36603a607430d2490a44556f`

### Variables

```json
{
  "input": {
    "pageSize": "number",
    "pageToken": "string",
    "patientUuid": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listHospitalizationAccountingSummaries": {
          "type": "object",
          "properties": {
            "hospitalizationAccountingSummaries": {
              "type": "array",
              "items": "empty"
            },
            "nextPageToken": {
              "type": "string",
              "sample": ""
            },
            "__typename": {
              "type": "string",
              "sample": "ListHospitalizationAccountingSummariesResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListHospitalizationDepartments

**Hash**: `c4f2961d4957103afc005a294a74ba99fb2429607867d276c4320a2ba7af2d3d`

### Variables

```json
{
  "input": {
    "hospitalizationUuid": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listHospitalizationDepartments": {
          "type": "object",
          "properties": {
            "hospitalizationDepartments": {
              "type": "array",
              "length": 1,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "8330fd20-bfcc-4542-9ec7-9bad88a85d2b"
                    },
                    "hospitalizationUuid": {
                      "type": "string",
                      "sample": "0bfe94cd-19da-4056-9baf-c67f95a1f26b"
                    },
                    "departmentUuid": {
                      "type": "string",
                      "sample": "916aadd2-d4c7-474e-8ff4-d8b92cfdbb87"
                    },
                    "date": {
                      "type": "object",
                      "properties": {
                        "year": {
                          "type": "number",
                          "sample": 2026
                        },
                        "month": {
                          "type": "number",
                          "sample": 1
                        },
                        "day": {
                          "type": "number",
                          "sample": 9
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Date"
                        }
                      }
                    },
                    "department": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "916aadd2-d4c7-474e-8ff4-d8b92cfdbb87"
                        },
                        "name": {
                          "type": "string",
                          "sample": "整形外科"
                        },
                        "receiptDepartmentCode": {
                          "type": "string",
                          "sample": "11"
                        },
                        "ff1DepartmentCode": {
                          "type": "string",
                          "sample": "120"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Department"
                        }
                      }
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "HospitalizationDepartment"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListHospitalizationDepartmentsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListHospitalizationDoctors

**Hash**: `f58a2d239d1a16b2ee1803ba67d0ff62cfb64dc18246d726ece2697e39db5ae9`

### Variables

```json
{
  "input": {
    "hospitalizationUuid": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listHospitalizationDoctors": {
          "type": "object",
          "properties": {
            "hospitalizationDoctors": {
              "type": "array",
              "length": 1,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "d6a1cc45-9939-4440-844e-e50a02e5f07c"
                    },
                    "hospitalizationUuid": {
                      "type": "string",
                      "sample": "0bfe94cd-19da-4056-9baf-c67f95a1f26b"
                    },
                    "doctorUuid": {
                      "type": "string",
                      "sample": "5bbead66-558f-4382-a46d-140e9a304e4b"
                    },
                    "date": {
                      "type": "object",
                      "properties": {
                        "year": {
                          "type": "number",
                          "sample": 2026
                        },
                        "month": {
                          "type": "number",
                          "sample": 1
                        },
                        "day": {
                          "type": "number",
                          "sample": 9
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Date"
                        }
                      }
                    },
                    "doctor": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "5bbead66-558f-4382-a46d-140e9a304e4b"
                        },
                        "name": {
                          "type": "string",
                          "sample": "満岡 　弘巳"
                        },
                        "namePhonetic": {
                          "type": "object",
                          "properties": {
                            "__typename": {
                              "type": "string",
                              "sample": "StringValue"
                            },
                            "value": {
                              "type": "string",
                              "sample": "マオカ ヒロミ"
                            }
                          }
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "User"
                        }
                      }
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "HospitalizationDoctor"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListHospitalizationDoctorsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListHospitalizationLocations

**Hash**: `e7d5934f97b33e3c467cd1f4c216083afdc613857325a71ad69202da9c648149`

### Variables

```json
{
  "input": {
    "hospitalizationUuid": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listHospitalizationLocations": {
          "type": "object",
          "properties": {
            "hospitalizationLocations": {
              "type": "array",
              "length": 1,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "2538413e-f8f2-45a5-b692-072ed2beb7f3"
                    },
                    "hospitalizationUuid": {
                      "type": "string",
                      "sample": "0bfe94cd-19da-4056-9baf-c67f95a1f26b"
                    },
                    "wardUuid": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "string",
                          "sample": "e7c51602-9d76-4800-a2ee-02b5d50d51fd"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "StringValue"
                        }
                      }
                    },
                    "roomUuid": {
                      "type": "null"
                    },
                    "transferDate": {
                      "type": "object",
                      "properties": {
                        "year": {
                          "type": "number",
                          "sample": 2026
                        },
                        "month": {
                          "type": "number",
                          "sample": 1
                        },
                        "day": {
                          "type": "number",
                          "sample": 9
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Date"
                        }
                      }
                    },
                    "transferTime": {
                      "type": "object",
                      "properties": {
                        "hours": {
                          "type": "number",
                          "sample": 10
                        },
                        "minutes": {
                          "type": "number",
                          "sample": 0
                        },
                        "seconds": {
                          "type": "number",
                          "sample": 0
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Time"
                        }
                      }
                    },
                    "ward": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "e7c51602-9d76-4800-a2ee-02b5d50d51fd"
                        },
                        "name": {
                          "type": "string",
                          "sample": "一般病棟"
                        },
                        "nameKana": {
                          "type": "string",
                          "sample": "イッパンビョウトウ"
                        },
                        "receiptWardType": {
                          "type": "string",
                          "sample": "GENERAL"
                        },
                        "wardCode": {
                          "type": "object",
                          "properties": {
                            "value": {
                              "type": "string",
                              "sample": "190620001"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "StringValue"
                            }
                          }
                        },
                        "isCommunityBasedCare": {
                          "type": "boolean",
                          "sample": false
                        },
                        "isKanwaCare": {
                          "type": "boolean",
                          "sample": false
                        },
                        "isKaigoIryouin": {
                          "type": "boolean",
                          "sample": false
                        },
                        "bedType": {
                          "type": "string",
                          "sample": "GENERAL_BEDS"
                        },
                        "ff1WardType": {
                          "type": "string",
                          "sample": "FF1_WARD_TYPE_GENERAL"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Ward"
                        }
                      }
                    },
                    "room": {
                      "type": "null"
                    },
                    "eventType": {
                      "type": "string",
                      "sample": "ADMISSION"
                    },
                    "hasCompleted": {
                      "type": "boolean",
                      "sample": false
                    },
                    "isCommunityBasedCareCalculationEnabled": {
                      "type": "boolean",
                      "sample": false
                    },
                    "isKanwaCareCalculationEnabled": {
                      "type": "boolean",
                      "sample": false
                    },
                    "roomNonHealthcareSystemChargePriceOverride": {
                      "type": "null"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "HospitalizationLocation"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListHospitalizationLocationsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListImagingOrderHistories

**Hash**: `9c7fced1e57cf786102fb3a3071c21b0c89b5442f30e6472b6d5077359d84086`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "imagingOrderUuid": {
          "type": "string",
          "sample": "1495d08c-490c-4284-9dc9-d582413db9c5"
        },
        "pageSize": {
          "type": "number",
          "sample": 100
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListLastApprovedPrescriptionOrderHistories

**Hash**: `6dfdac6bafb22665dcb7bc584b45da378341f9c98df371f0d2026f3723913125`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "prescriptionOrderUuids": {
          "type": "array",
          "length": 1,
          "items": [
            {
              "type": "string",
              "sample": "e498463d-3212-4c76-8042-febdc2095a5f"
            }
          ]
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListLatestFinalizedBiopsyInspectionOrderHistories

**Hash**: `50e350f2dafca11fea527d31b11f11e5003d831efde19d31cb8c6b4667da207d`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "biopsyInspectionOrderUuids": {
          "type": "array",
          "length": 1,
          "items": [
            {
              "type": "string",
              "sample": "f38b055e-f58a-43ce-b0e7-ade6e0ac784b"
            }
          ]
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListLatestFinalizedImagingOrderHistories

**Hash**: `2ba912950899a0770635719bdd64c8c0bbda9153f0d09534a10c0c10b09553a0`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "imagingOrderUuids": {
          "type": "array",
          "length": 1,
          "items": [
            {
              "type": "string",
              "sample": "1495d08c-490c-4284-9dc9-d582413db9c5"
            }
          ]
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListLatestFinalizedSpecimenInspectionOrderHistories

**Hash**: `86aaa4eaaaf226a2401a1e5bfdd288b3af6654b05c7584d94cef5ef212664810`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "specimenInspectionOrderUuids": {
          "type": "array",
          "length": 1,
          "items": [
            {
              "type": "string",
              "sample": "b20449a2-c24f-45e0-ab37-1536860da48f"
            }
          ]
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListLaunchIntegrations

**Hash**: `96e346597610d4564f4d3180aa73fc539356b086c58bb7176dc29a1d4b1b025a`

### Variables

```json
{
  "type": "object",
  "properties": {}
}
```

### Response Schema

```json

```

---

## ListLocalMedicines

**Hash**: `af471c35f23881c22bf26b89124fb0c972a3768c7306845706aed46f358f8490`

### Variables

```json
{
  "input": {
    "pageSize": "number",
    "pageToken": "string",
    "query": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listLocalMedicines": {
          "type": "object",
          "properties": {
            "localMedicines": {
              "type": "array",
              "length": 200,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "5173a47e-c8ae-432a-8729-f4b56f5f8c1c"
                    },
                    "mhlwMedicineCode": {
                      "type": "string",
                      "sample": "620007749"
                    },
                    "name": {
                      "type": "string",
                      "sample": "フェルビナクテープ７０ｍｇ「ＥＭＥＣ」　１０ｃｍ×１４ｃｍ"
                    },
                    "nameKana": {
                      "type": "string",
                      "sample": "フェルビナクテープ"
                    },
                    "description": {
                      "type": "string",
                      "sample": ""
                    },
                    "patientCareType": {
                      "type": "string",
                      "sample": "PATIENT_CARE_TYPE_INPATIENT"
                    },
                    "startDate": {
                      "type": "object",
                      "properties": {
                        "year": {
                          "type": "number",
                          "sample": 2025
                        },
                        "month": {
                          "type": "number",
                          "sample": 7
                        },
                        "day": {
                          "type": "number",
                          "sample": 4
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Date"
                        }
                      }
                    },
                    "endDate": {
                      "type": "null"
                    },
                    "applicableDosageFormTypes": {
                      "type": "array",
                      "length": 1,
                      "items": [
                        {
                          "type": "number",
                          "sample": 6
                        }
                      ]
                    },
                    "masterMedicine": {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "sample": "620007749"
                        },
                        "name": {
                          "type": "string",
                          "sample": "フェルビナクテープ７０ｍｇ「ＥＭＥＣ」　１０ｃｍ×１４ｃｍ"
                        },
                        "unitCode": {
                          "type": "number",
                          "sample": 6
                        },
                        "dosageFormType": {
                          "type": "number",
                          "sample": 6
                        },
                        "priceType": {
                          "type": "number",
                          "sample": 1
                        },
                        "isPrescriptionVolumeRequired": {
                          "type": "boolean",
                          "sample": true
                        },
                        "otherDosageFormTypes": {
                          "type": "array",
                          "items": "empty"
                        },
                        "otherUnitCodes": {
                          "type": "array",
                          "items": "empty"
                        },
                        "slidingScaleType": {
                          "type": "string",
                          "sample": "SLIDING_SCALE_TYPE_DISABLED_CHANGEABLE"
                        },
                        "isLocalMedicine": {
                          "type": "boolean",
                          "sample": false
                        },
                        "psychiatricDrugType": {
                          "type": "number",
                          "sample": 0
                        },
                        "price": {
                          "type": "object",
                          "properties": {
                            "value": {
                              "type": "number",
                              "sample": 1440
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "Frac100"
                            }
                          }
                        },
                        "ingredientAmountContent": {
                          "type": "null"
                        },
                        "selectiveMedicalServiceType": {
                          "type": "string",
                          "sample": "SELECTIVE_MEDICAL_SERVICE_TYPE_UNSPECIFIED"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "MasterMedicine"
                        }
                      }
                    },
                    "ingredientAmountContent": {
                      "type": "null"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "LocalMedicine"
                    }
                  }
                }
              ]
            },
            "nextPageToken": {
              "type": "string",
              "sample": "200"
            },
            "__typename": {
              "type": "string",
              "sample": "ListLocalMedicinesResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListMonthlyReceiptStates

**Hash**: `81811e4e0564887fd132fa9cc98a050e598cc3d02674c9771732533e73a8ac07`

### Variables

```json
{
  "input": {
    "invoiceMonth": {
      "year": "number",
      "month": "number"
    },
    "healthInsuranceFilters": "[]",
    "invoiceStatusFilters": "[]",
    "inpatientOutpatientFilters": "[]"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listMonthlyReceiptStates": {
          "type": "object",
          "properties": {
            "monthlyReceiptStates": {
              "type": "array",
              "length": 398,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "receiptUnitKeyHash": {
                      "type": "string",
                      "sample": "294b1093c3c72d8a886f4dd291cac83d457586148d7f231b21..."
                    },
                    "patientUuid": {
                      "type": "string",
                      "sample": "929aa0f1-e995-4506-8343-bc5ce76d9ef8"
                    },
                    "patientHealthInsuranceUuid": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "string",
                          "sample": "1820d20f-759c-48fd-9af8-8ca8f7f85808"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "StringValue"
                        }
                      }
                    },
                    "patientPublicSubsidyUuids": {
                      "type": "array",
                      "items": "empty"
                    },
                    "consultationYearMonth": {
                      "type": "object",
                      "properties": {
                        "year": {
                          "type": "number",
                          "sample": 2025
                        },
                        "month": {
                          "type": "number",
                          "sample": 10
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "YearMonth"
                        }
                      }
                    },
                    "isHospitalization": {
                      "type": "boolean",
                      "sample": false
                    },
                    "invoiceStatus": {
                      "type": "string",
                      "sample": "HOLD_RELEASED"
                    },
                    "holdReleaseYearMonth": {
                      "type": "object",
                      "properties": {
                        "year": {
                          "type": "number",
                          "sample": 2025
                        },
                        "month": {
                          "type": "number",
                          "sample": 12
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "YearMonth"
                        }
                      }
                    },
                    "patient": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "929aa0f1-e995-4506-8343-bc5ce76d9ef8"
                        },
                        "serialNumber": {
                          "type": "string",
                          "sample": "16588"
                        },
                        "serialNumberPrefix": {
                          "type": "string",
                          "sample": ""
                        },
                        "fullName": {
                          "type": "string",
                          "sample": "細川 さえ子"
                        },
                        "fullNamePhonetic": {
                          "type": "string",
                          "sample": "ホソカワ サエコ"
                        },
                        "isDraft": {
                          "type": "boolean",
                          "sample": false
                        },
                        "isTestPatient": {
                          "type": "boolean",
                          "sample": false
                        },
                        "detail": {
                          "type": "object",
                          "properties": {
                            "patientUuid": {
                              "type": "string",
                              "sample": "929aa0f1-e995-4506-8343-bc5ce76d9ef8"
                            },
                            "addressLine_1": {
                              "type": "string",
                              "sample": "高松市上福岡町891-4"
                            },
                            "addressLine_2": {
                              "type": "string",
                              "sample": ""
                            },
                            "postalCode": {
                              "type": "string",
                              "sample": "760-0077"
                            },
                            "email": {
                              "type": "string",
                              "sample": ""
                            },
                            "phoneNumber": {
                              "type": "string",
                              "sample": "887-8952"
                            },
                            "sexType": {
                              "type": "string",
                              "sample": "SEX_TYPE_FEMALE"
                            },
                            "birthDate": {
                              "type": "object",
                              "properties": {
                                "year": {
                                  "type": "number",
                                  "sample": 1977
                                },
                                "month": {
                                  "type": "number",
                                  "sample": 7
                                },
                                "day": {
                                  "type": "number",
                                  "sample": 29
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "Date"
                                }
                              }
                            },
                            "memo": {
                              "type": "string",
                              "sample": "TEL:09049765222    医療情報取得加算(再)07年12月"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "PatientDetail"
                            }
                          }
                        },
                        "tags": {
                          "type": "array",
                          "items": "empty"
                        },
                        "attentionSummary": {
                          "type": "object",
                          "properties": {
                            "hasAnyInfection": {
                              "type": "boolean",
                              "sample": false
                            },
                            "hasAnyAllergy": {
                              "type": "boolean",
                              "sample": false
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "PatientAttentionSummary"
                            }
                          }
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Patient"
                        }
                      }
                    },
                    "insuranceCombinationDescription": {
                      "type": "string",
                      "sample": "協会"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "MonthlyReceiptState"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListMonthlyReceiptStatesResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListNonEmptyPatientFileFoldersOfPatient

**Hash**: `3f3e6667e3b13fa03f681290c28fbbd1887b19b7f09b946b815d5aa976a06c71`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "2bfecb0b-d770-4932-beb4-49c16e63ae8c"
        },
        "pageSize": {
          "type": "number",
          "sample": 100
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        },
        "parentFileFolderUuid": {
          "type": "null",
          "sample": null
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListNonHealthcareSystemActions

**Hash**: `d96c612490f9bab3e179596aaabbe86ef7a23be94a4e52996abe40a74f36b4c3`

### Variables

```json
{
  "input": {
    "pageSize": "number",
    "pageToken": "string",
    "query": "string",
    "patientCareType": "string",
    "dateRange": {
      "start": {
        "year": "number",
        "month": "number",
        "day": "number"
      },
      "end": "null"
    }
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listNonHealthcareSystemActions": {
          "type": "object",
          "properties": {
            "nonHealthcareSystemActions": {
              "type": "array",
              "length": 60,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "3145dfeb-dd6c-4af6-9c3b-9386cb33d25d"
                    },
                    "name": {
                      "type": "string",
                      "sample": "【00】室料(税込・2200円)"
                    },
                    "netPrice": {
                      "type": "number",
                      "sample": 2000
                    },
                    "canUseWithHealthcareSystem": {
                      "type": "boolean",
                      "sample": false
                    },
                    "taxRate": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "number",
                          "sample": 10
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Frac100"
                        }
                      }
                    },
                    "startDate": {
                      "type": "object",
                      "properties": {
                        "year": {
                          "type": "number",
                          "sample": 2025
                        },
                        "month": {
                          "type": "number",
                          "sample": 1
                        },
                        "day": {
                          "type": "number",
                          "sample": 1
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Date"
                        }
                      }
                    },
                    "endDate": {
                      "type": "null"
                    },
                    "patientCareType": {
                      "type": "string",
                      "sample": "PATIENT_CARE_TYPE_INPATIENT"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "NonHealthcareSystemAction"
                    }
                  }
                }
              ]
            },
            "nextPageToken": {
              "type": "string",
              "sample": ""
            },
            "__typename": {
              "type": "string",
              "sample": "ListNonHealthcareSystemActionsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListNotifiableOrders

**Hash**: `fe273102a4058a0e044e009fa99226c7eb155695fd4ba186825353e46656a938`

### Variables

```json
{
  "input": {
    "filterOrderTypes": "[]",
    "accountingOrderExtendedShinryoShikibetsus": "[]",
    "filterDoctorUuid": {
      "value": "string"
    },
    "filterRequiredOrderStatusActions": "[]",
    "filterWardUuids": "[]",
    "filterRoomUuids": "[]",
    "patientCareType": "string",
    "pageSize": "number",
    "pageToken": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listNotifiableOrders": {
          "type": "object",
          "properties": {
            "patientOrders": {
              "type": "array",
              "length": 1,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "patient": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
                        },
                        "serialNumber": {
                          "type": "string",
                          "sample": "00001"
                        },
                        "serialNumberPrefix": {
                          "type": "string",
                          "sample": ""
                        },
                        "fullName": {
                          "type": "string",
                          "sample": "テスト 1"
                        },
                        "fullNamePhonetic": {
                          "type": "string",
                          "sample": "テスト イチ"
                        },
                        "isDraft": {
                          "type": "boolean",
                          "sample": false
                        },
                        "isTestPatient": {
                          "type": "boolean",
                          "sample": true
                        },
                        "detail": {
                          "type": "object",
                          "properties": {
                            "patientUuid": {
                              "type": "string",
                              "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
                            },
                            "addressLine_1": {
                              "type": "string",
                              "sample": "香川県高松市テスト町"
                            },
                            "addressLine_2": {
                              "type": "string",
                              "sample": "てすとマンション"
                            },
                            "postalCode": {
                              "type": "string",
                              "sample": "123-4567"
                            },
                            "email": {
                              "type": "string",
                              "sample": "test1@test.com"
                            },
                            "phoneNumber": {
                              "type": "string",
                              "sample": "123456789"
                            },
                            "sexType": {
                              "type": "string",
                              "sample": "SEX_TYPE_MALE"
                            },
                            "birthDate": {
                              "type": "object",
                              "properties": {
                                "year": {
                                  "type": "number",
                                  "sample": 1975
                                },
                                "month": {
                                  "type": "number",
                                  "sample": 9
                                },
                                "day": {
                                  "type": "number",
                                  "sample": 18
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "Date"
                                }
                              }
                            },
                            "memo": {
                              "type": "string",
                              "sample": "急変時は日赤に搬送希望あり"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "PatientDetail"
                            }
                          }
                        },
                        "tags": {
                          "type": "array",
                          "length": 2,
                          "items": [
                            {
                              "type": "string",
                              "sample": "test"
                            }
                          ]
                        },
                        "attentionSummary": {
                          "type": "object",
                          "properties": {
                            "hasAnyInfection": {
                              "type": "boolean",
                              "sample": false
                            },
                            "hasAnyAllergy": {
                              "type": "boolean",
                              "sample": false
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "PatientAttentionSummary"
                            }
                          }
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Patient"
                        }
                      }
                    },
                    "orders": {
                      "type": "array",
                      "length": 4,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "e498463d-3212-4c76-8042-febdc2095a5f"
                            },
                            "orderType": {
                              "type": "string",
                              "sample": "ORDER_TYPE_PRESCRIPTION"
                            },
                            "order": {
                              "type": "object",
                              "properties": {
                                "uuid": {
                                  "type": "string",
                                  "sample": "e498463d-3212-4c76-8042-febdc2095a5f"
                                },
                                "imagingOrder": {
                                  "type": "null"
                                },
                                "nutritionOrder": {
                                  "type": "null"
                                },
                                "biopsyInspectionOrder": {
                                  "type": "null"
                                },
                                "specimenInspectionOrder": {
                                  "type": "null"
                                },
                                "rehabilitationOrder": {
                                  "type": "null"
                                },
                                "prescriptionOrderV2": {
                                  "type": "object",
                                  "properties": {
                                    "createTime": {
                                      "type": "max_depth"
                                    },
                                    "createUser": {
                                      "type": "max_depth"
                                    },
                                    "doctor": {
                                      "type": "max_depth"
                                    },
                                    "doctorUuid": {
                                      "type": "max_depth"
                                    },
                                    "medicationCategory": {
                                      "type": "max_depth"
                                    },
                                    "narcoticPractitioner": {
                                      "type": "max_depth"
                                    },
                                    "narcoticPractitionerUuid": {
                                      "type": "max_depth"
                                    },
                                    "note": {
                                      "type": "max_depth"
                                    },
                                    "orderStatus": {
                                      "type": "max_depth"
                                    },
                                    "patient": {
                                      "type": "max_depth"
                                    },
                                    "patientUuid": {
                                      "type": "max_depth"
                                    },
                                    "revokeDescription": {
                                      "type": "max_depth"
                                    },
                                    "rps": {
                                      "type": "max_depth"
                                    },
                                    "startDate": {
                                      "type": "max_depth"
                                    },
                                    "updateTime": {
                                      "type": "max_depth"
                                    },
                                    "updateUser": {
                                      "type": "max_depth"
                                    },
                                    "uuid": {
                                      "type": "max_depth"
                                    },
                                    "encounterId": {
                                      "type": "max_depth"
                                    },
                                    "extendedInsuranceCombinationId": {
                                      "type": "max_depth"
                                    },
                                    "isDraft": {
                                      "type": "max_depth"
                                    },
                                    "isOutpatient": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "injectionOrderV2": {
                                  "type": "null"
                                },
                                "accountingOrder": {
                                  "type": "null"
                                },
                                "specimenInspectionOrderV2": {
                                  "type": "null"
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "Order_order"
                                },
                                "prescriptionOrder": {
                                  "type": "null"
                                },
                                "injectionOrder": {
                                  "type": "null"
                                }
                              }
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "Order"
                            }
                          }
                        }
                      ]
                    },
                    "finalizedLatestOrders": {
                      "type": "array",
                      "items": "empty"
                    },
                    "lastHospitalizationLocation": {
                      "type": "null"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "PatientOrders"
                    }
                  }
                }
              ]
            },
            "nextPageToken": {
              "type": "string",
              "sample": ""
            },
            "__typename": {
              "type": "string",
              "sample": "ListNotifiableOrdersResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListNursingJournalEditorTemplates

**Hash**: `30f5eba5e6fc9e36c058e3063ba3fcb126ebcb815395d09afa34128a354e2cee`

### Variables

```json
{
  "input": {
    "query": "string",
    "pageSize": "number",
    "pageToken": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listNursingJournalEditorTemplates": {
          "type": "object",
          "properties": {
            "nursingJournalEditorTemplates": {
              "type": "array",
              "length": 1,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "f7fcb9aa-721e-4144-b1f3-c75cfeec85b5"
                    },
                    "title": {
                      "type": "string",
                      "sample": "SOAP"
                    },
                    "description": {
                      "type": "string",
                      "sample": ""
                    },
                    "editorData": {
                      "type": "string",
                      "sample": "{\n  \"blocks\": [\n    {\n      \"key\": \"574vg\",\n      ..."
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "NursingJournalEditorTemplate"
                    }
                  }
                }
              ]
            },
            "nextPageToken": {
              "type": "string",
              "sample": ""
            },
            "__typename": {
              "type": "string",
              "sample": "ListNursingJournalEditorTemplatesResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListNursingJournals

**Hash**: `1e8bbd7ae5b7ac6cc34134db05f03afc0ee5e054ca795142e68c6a17a8515d0f`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
        },
        "pageSize": {
          "type": "number",
          "sample": 100
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListOrders

**Hash**: `bb3684f37ab0c02d11af5497c20a1d0783105e8a57de28e0bb197bad45af7bdc`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
        },
        "filterOrderStatus": {
          "type": "array",
          "length": 4,
          "items": [
            {
              "type": "string",
              "sample": "ORDER_STATUS_ACTIVE"
            }
          ]
        },
        "patientCareType": {
          "type": "string",
          "sample": "PATIENT_CARE_TYPE_ANY"
        },
        "filterOrderTypes": {
          "type": "array",
          "length": 1,
          "items": [
            {
              "type": "string",
              "sample": "ORDER_TYPE_REHABILITATION"
            }
          ]
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListOrganizationClinicalRecordViewFilters

**Hash**: `c4c28fa05f4d78bda4eb2a3bd2736b1a1d55f655a06ef396f39a0736c5f10086`

### Variables

```json
{
  "type": "object",
  "properties": {}
}
```

### Response Schema

```json

```

---

## ListOrganizationImagingModalities

**Hash**: `cb51cef04e5fe354b5bf81c680fa41c7421f9c7dc54de6f69ae0489cc5434c76`

### Variables

```json
{
  "type": "object",
  "properties": {}
}
```

### Response Schema

```json

```

---

## ListOrganizationInstitutionStandards

**Hash**: `2ce0e0d80c7b78b9321b9b7083b247363ce98f30475e9db08af48c861847bbaa`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "searchDate": {
          "type": "object",
          "properties": {
            "year": {
              "type": "number",
              "sample": 2025
            },
            "month": {
              "type": "number",
              "sample": 12
            },
            "day": {
              "type": "number",
              "sample": 31
            }
          }
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListOrganizationMemberships

**Hash**: `10f8a904305fdceffa5f31a1e7d6331d5d50752889c74b9027f50c0c524ce5e6`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "pageSize": {
          "type": "number",
          "sample": 100000
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListOutpatientAccountingForNavigation

**Hash**: `384f3c385e82bc55db1229886e4459d77f159bee319573a9da795d12a6a00ba3`

### Variables

```json
{
  "input": {
    "patientId": "string",
    "pageSize": "number",
    "pageToken": "null"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "outpatientAccountings": {
          "type": "object",
          "properties": {
            "patientId": {
              "type": "string",
              "sample": "19779efe-e25a-444d-9440-2538cbfaca63"
            },
            "accountingResponses": {
              "type": "array",
              "length": 5,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "id": {
                      "type": "string",
                      "sample": "21916fa6-e527-11f0-86c4-01d6be709867"
                    },
                    "consultationDate": {
                      "type": "string",
                      "sample": "2025-12-30"
                    },
                    "session": {
                      "type": "object",
                      "properties": {
                        "doctor": {
                          "type": "object",
                          "properties": {
                            "departmentName": {
                              "type": "string",
                              "sample": "整形外科"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "User"
                            }
                          }
                        },
                        "purposeOfVisit": {
                          "type": "object",
                          "properties": {
                            "title": {
                              "type": "string",
                              "sample": "整形外科"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "PurposeOfVisit"
                            }
                          }
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "OutpatientAccountingSession"
                        }
                      }
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "OutpatientAccounting"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListOutpatientAccountingResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListOutpatientAccountingWithBilling

**Hash**: `6038383cf722544683c3d72983031943c590ed9ab09296e542cf019fffafed3d`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "patientId": {
          "type": "string",
          "sample": "2bfecb0b-d770-4932-beb4-49c16e63ae8c"
        },
        "pageSize": {
          "type": "number",
          "sample": 10
        },
        "pageToken": {
          "type": "null",
          "sample": null
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListPatientCeilingAmountApplications

**Hash**: `adff28374cd80fb5b810ca541c3912495f09f07211cec94562a24659461894cb`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "2bfecb0b-d770-4932-beb4-49c16e63ae8c"
        },
        "pageSize": {
          "type": "number",
          "sample": 100
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListPatientContacts

**Hash**: `d7c118d3803ed3fb5faa1a175cc44b7af91f16f6cc18da87435c55f7c838e629`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListPatientDocumentTemplates

**Hash**: `4d1e4b03508c6e65a316b200a079295adb3ad5782c93f98f8727afec01898f3b`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "departmentCode": {
          "type": "null",
          "sample": null
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListPatientFileFolders

**Hash**: `e5b8237f63c2fa1d4df28a900bdc151c395b040ea43415f94d511bf4a77bafb7`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "pageSize": {
          "type": "number",
          "sample": 100
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        },
        "parentFileFolderUuid": {
          "type": "null",
          "sample": null
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListPatientFiles

**Hash**: `9b6c9015e5cd08ba2e93ec2eded98418415667bb849bfac9f75babb26fc95687`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "2bfecb0b-d770-4932-beb4-49c16e63ae8c"
        },
        "parentFileFolderUuid": {
          "type": "null",
          "sample": null
        },
        "pageSize": {
          "type": "number",
          "sample": 100
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListPatientHealthcareFeeExemptionCertificates

**Hash**: `436d9d77f3344076ccc2a560f1798c680246b4c09cb0e1a60835976bdde4eaf1`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "2bfecb0b-d770-4932-beb4-49c16e63ae8c"
        },
        "pageSize": {
          "type": "number",
          "sample": 100
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListPatientHealthInsurances

**Hash**: `14c39cd954b35e130b282b5d50cbd1c5d5fa100f435fa80c707f258e33f19695`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "2bfecb0b-d770-4932-beb4-49c16e63ae8c"
        },
        "pageSize": {
          "type": "number",
          "sample": 100
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListPatientHospitalizations

**Hash**: `310930204c34a11c5c12c445ae356a4cf5e692f779512b6a542abef0d6869560`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
        },
        "pageSize": {
          "type": "number",
          "sample": 100
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListPatientLongTermCareInsurances

**Hash**: `00958b060e7b22f1a6be1d91bb98215ad7f433ead590363d36574dc93bc1bd86`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "2bfecb0b-d770-4932-beb4-49c16e63ae8c"
        },
        "pageSize": {
          "type": "number",
          "sample": 100
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListPatientPublicSubsidies

**Hash**: `88baf8729eb3283fb16c5ecb29251a395c3e081cd292d29405825fcc13b61f42`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "2bfecb0b-d770-4932-beb4-49c16e63ae8c"
        },
        "pageSize": {
          "type": "number",
          "sample": 100
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListPatientQualifications

**Hash**: `c7c2bbf4c550be293ad79b0caa7b9a0e5bd6b7b15b24fc33d95a55a58b5f14b5`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "filterOnlyRecent": {
          "type": "boolean",
          "sample": true
        },
        "matchAgainstPatientId": {
          "type": "string",
          "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
        },
        "syncJobId": {
          "type": "null",
          "sample": null
        },
        "pageSize": {
          "type": "number",
          "sample": 100
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListPatientReceiptDiseases

**Hash**: `616f117a30bc06f9034e0e06ff5ee765052a23426abc5d6a68d6b784819b22e6`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "patientUuids": {
          "type": "array",
          "length": 1,
          "items": [
            {
              "type": "string",
              "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
            }
          ]
        },
        "patientCareType": {
          "type": "string",
          "sample": "PATIENT_CARE_TYPE_ANY"
        },
        "onlyMain": {
          "type": "boolean",
          "sample": false
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListPatientReceiptTokkijiko

**Hash**: `49c0be961d427734f821dadbee9e4f3295aa0869f7238ff939213ca3abdfa05a`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "2bfecb0b-d770-4932-beb4-49c16e63ae8c"
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListPatientSessionInvoices

**Hash**: `31ab06853216b5a6d40dcfb04d3108d317763788aae4d2ccd61f45cbc343db1b`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "2bfecb0b-d770-4932-beb4-49c16e63ae8c"
        },
        "pageSize": {
          "type": "number",
          "sample": 10
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListPatientSessions

**Hash**: `ebe30fd63a074d22d1feaafe92b08469fad1de719e1b654265681f40afb40af0`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
        },
        "filterDateRange": {
          "type": "object",
          "properties": {
            "start": {
              "type": "object",
              "properties": {
                "year": {
                  "type": "number",
                  "sample": 2025
                },
                "month": {
                  "type": "number",
                  "sample": 12
                },
                "day": {
                  "type": "number",
                  "sample": 31
                }
              }
            }
          }
        },
        "includeEncounter": {
          "type": "boolean",
          "sample": true
        },
        "pageSize": {
          "type": "number",
          "sample": 50
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListPatientSessionsForConfirmSimilarSessions

**Hash**: `bd3703245e2b75fa94eb348a6eafba8d6ad635f6dc9f98b8d119a2e42d32355e`

### Variables

```json
{
  "input": {
    "patientUuid": "string",
    "pageSize": "number",
    "pageToken": "string",
    "filterDateRange": {
      "start": {
        "year": "number",
        "month": "number",
        "day": "number"
      },
      "end": {
        "year": "number",
        "month": "number",
        "day": "number"
      }
    },
    "includeEncounter": "boolean"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listPatientSessions": {
          "type": "object",
          "properties": {
            "sessions": {
              "type": "array",
              "items": "empty"
            },
            "nextPageToken": {
              "type": "string",
              "sample": ""
            },
            "__typename": {
              "type": "string",
              "sample": "ListPatientSessionsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListPatientSummaries

**Hash**: `cd93571d60af5bcf798dc556b7ab89d2c4ea3c4d7bd6e1aadfe6a5ee19eef32a`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "sample": ""
        },
        "hospitalizationFilter": {
          "type": "object",
          "properties": {
            "doctorUuid": {
              "type": "null",
              "sample": null
            },
            "roomUuids": {
              "type": "array",
              "length": 0,
              "items": "empty"
            },
            "wardUuids": {
              "type": "array",
              "length": 0,
              "items": "empty"
            },
            "states": {
              "type": "array",
              "length": 0,
              "items": "empty"
            },
            "onlyLatest": {
              "type": "boolean",
              "sample": false
            }
          }
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListPatientsV2

**Hash**: `0163f0b5782e052cc317a193b1deac2c4d93d4017579774d90cc194fd7f42a08`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "generalFilter": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "sample": ""
            },
            "patientCareType": {
              "type": "string",
              "sample": "PATIENT_CARE_TYPE_ANY"
            }
          }
        },
        "hospitalizationFilter": {
          "type": "object",
          "properties": {
            "doctorUuid": {
              "type": "null",
              "sample": null
            },
            "roomUuids": {
              "type": "array",
              "length": 0,
              "items": "empty"
            },
            "wardUuids": {
              "type": "array",
              "length": 0,
              "items": "empty"
            },
            "states": {
              "type": "array",
              "length": 0,
              "items": "empty"
            },
            "onlyLatest": {
              "type": "boolean",
              "sample": true
            }
          }
        },
        "sorts": {
          "type": "array",
          "length": 0,
          "items": "empty"
        },
        "pageSize": {
          "type": "number",
          "sample": 100
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListPatientTokuteiSippeiRyouyouJuryoushous

**Hash**: `25063afa2209cc35677f5fcf3b78260640e0c64c5e1e483b7e8362e5be0eedf0`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "2bfecb0b-d770-4932-beb4-49c16e63ae8c"
        },
        "pageSize": {
          "type": "number",
          "sample": 100
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListPrescriptionOrderHistories

**Hash**: `3b58b1e80a3b1990170056af43c2eeebbf968f367a07f83de5c6920c9417ba92`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "prescriptionOrderUuid": {
          "type": "string",
          "sample": "e498463d-3212-4c76-8042-febdc2095a5f"
        },
        "pageSize": {
          "type": "number",
          "sample": 100
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListPurposeOfVisits

**Hash**: `77f4f4540079f300ff2c2ec757e1a301f7b153fe39b06a95350dc54d09ef88bd`

### Variables

```json
{
  "input": {
    "searchDate": {
      "day": "number",
      "month": "number",
      "year": "number"
    }
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listPurposeOfVisits": {
          "type": "object",
          "properties": {
            "purposeOfVisits": {
              "type": "array",
              "length": 9,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "acdfdb0a-b7d2-4fad-96d9-fc6bb96a8c77"
                    },
                    "title": {
                      "type": "string",
                      "sample": "整形外科"
                    },
                    "isHouseCall": {
                      "type": "boolean",
                      "sample": false
                    },
                    "idealTimeframe": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "number",
                          "sample": 30
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "UInt32Value"
                        }
                      }
                    },
                    "startDate": {
                      "type": "null"
                    },
                    "endDate": {
                      "type": "null"
                    },
                    "order": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "number",
                          "sample": 1
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "UInt32Value"
                        }
                      }
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "PurposeOfVisit"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListPurposeOfVisitsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListReceiptRemarksColumns

**Hash**: `c7ec8c2045e5ccb9792a877b440b417f26259afb4209f9ca8d1b6844e77ca9da`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "2bfecb0b-d770-4932-beb4-49c16e63ae8c"
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListRehabilitationDocuments

**Hash**: `b7a50dc3c27506e9c0fcdb13cb1b504487b8979fdd2ab5a54eaa83a95f907d3e`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
        },
        "date": {
          "type": "object",
          "properties": {
            "year": {
              "type": "number",
              "sample": 2025
            },
            "month": {
              "type": "number",
              "sample": 12
            },
            "day": {
              "type": "number",
              "sample": 31
            }
          }
        },
        "pageSize": {
          "type": "number",
          "sample": 100
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListRehabilitationDocumentTemplates

**Hash**: `07aa49636d6ae58c55fdcb9d035b188eb8e21ff152fc50f11be24fa71d55bbd6`

### Variables

```json
{
  "input": {
    "query": "string",
    "pageSize": "number",
    "pageToken": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listRehabilitationDocumentTemplates": {
          "type": "object",
          "properties": {
            "rehabilitationDocumentTemplates": {
              "type": "array",
              "length": 4,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "577ec5a5-37bb-4f76-8299-d66c72604d56"
                    },
                    "title": {
                      "type": "string",
                      "sample": "＜訓練レベルとADL評価＞"
                    },
                    "description": {
                      "type": "string",
                      "sample": "◯または△を「訓練」、「見守り」、「実用」の欄にいれてください。実施がなければその記載を残してくださ..."
                    },
                    "editorData": {
                      "type": "string",
                      "sample": "{\n  \"blocks\": [\n    {\n      \"key\": \"445be\",\n      ..."
                    },
                    "startDate": {
                      "type": "null"
                    },
                    "endDate": {
                      "type": "null"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "RehabilitationDocumentTemplate"
                    }
                  }
                }
              ]
            },
            "nextPageToken": {
              "type": "string",
              "sample": ""
            },
            "__typename": {
              "type": "string",
              "sample": "ListRehabilitationDocumentTemplatesResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListRehabilitationPlans

**Hash**: `73e49a4e3e11c03f67a06d811aaece14969bb608d7fdf1404d9408a34d42414c`

### Variables

```json
{
  "type": "object",
  "properties": {}
}
```

### Response Schema

```json

```

---

## ListResubmittableReceipts

**Hash**: `c761b3dafa7ddf86e7accf815c35c03c2b011e9fa4d1515269edf04e452d3b71`

### Variables

```json
{}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listResubmittableReceipts": {
          "type": "object",
          "properties": {
            "resubmittableReceipts": {
              "type": "array",
              "length": 6,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "f174375d-1340-4c50-af63-fae8c9336bda"
                    },
                    "paymentInstitution": {
                      "type": "string",
                      "sample": "SOCIAL_INSURANCE"
                    },
                    "yearMonth": {
                      "type": "object",
                      "properties": {
                        "year": {
                          "type": "number",
                          "sample": 2025
                        },
                        "month": {
                          "type": "number",
                          "sample": 10
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "YearMonth"
                        }
                      }
                    },
                    "isResubmitted": {
                      "type": "boolean",
                      "sample": true
                    },
                    "defectGroups": {
                      "type": "array",
                      "length": 2,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "patientUuid": {
                              "type": "string",
                              "sample": "2021a0d2-d107-4155-bfe0-2eaaec7245c1"
                            },
                            "patient": {
                              "type": "object",
                              "properties": {
                                "uuid": {
                                  "type": "string",
                                  "sample": "2021a0d2-d107-4155-bfe0-2eaaec7245c1"
                                },
                                "serialNumber": {
                                  "type": "string",
                                  "sample": "20069"
                                },
                                "serialNumberPrefix": {
                                  "type": "string",
                                  "sample": ""
                                },
                                "fullName": {
                                  "type": "string",
                                  "sample": "橋本 樹武"
                                },
                                "fullNamePhonetic": {
                                  "type": "string",
                                  "sample": "ハシモト ジン"
                                },
                                "isDraft": {
                                  "type": "boolean",
                                  "sample": false
                                },
                                "isTestPatient": {
                                  "type": "boolean",
                                  "sample": false
                                },
                                "detail": {
                                  "type": "object",
                                  "properties": {
                                    "patientUuid": {
                                      "type": "max_depth"
                                    },
                                    "addressLine_1": {
                                      "type": "max_depth"
                                    },
                                    "addressLine_2": {
                                      "type": "max_depth"
                                    },
                                    "postalCode": {
                                      "type": "max_depth"
                                    },
                                    "email": {
                                      "type": "max_depth"
                                    },
                                    "phoneNumber": {
                                      "type": "max_depth"
                                    },
                                    "sexType": {
                                      "type": "max_depth"
                                    },
                                    "birthDate": {
                                      "type": "max_depth"
                                    },
                                    "memo": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "tags": {
                                  "type": "array",
                                  "items": "empty"
                                },
                                "attentionSummary": {
                                  "type": "object",
                                  "properties": {
                                    "hasAnyInfection": {
                                      "type": "max_depth"
                                    },
                                    "hasAnyAllergy": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "Patient"
                                }
                              }
                            },
                            "defects": {
                              "type": "array",
                              "length": 1,
                              "items": [
                                {
                                  "type": "object",
                                  "properties": {
                                    "uuid": {
                                      "type": "max_depth"
                                    },
                                    "reasonCode": {
                                      "type": "max_depth"
                                    },
                                    "reasonMessage": {
                                      "type": "max_depth"
                                    },
                                    "isCorrected": {
                                      "type": "max_depth"
                                    },
                                    "updateTime": {
                                      "type": "max_depth"
                                    },
                                    "updateUserUuid": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                }
                              ]
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "ResubmittableReceipt_DefectGroup"
                            }
                          }
                        }
                      ]
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "ResubmittableReceipt"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListResubmittableReceiptsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListRoomNonHealthcareSystemCharges

**Hash**: `5c7b321d3a94d60da17c87bb637a50dc7fbd4f8bc9bd63baa7578e66b474e1df`

### Variables

```json
{
  "input": {
    "searchDate": {
      "year": "number",
      "month": "number",
      "day": "number"
    }
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listRoomNonHealthcareSystemCharges": {
          "type": "object",
          "properties": {
            "roomNonHealthcareSystemCharges": {
              "type": "array",
              "length": 17,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "6a357b97-1e98-4cce-bc87-f68b92b64809"
                    },
                    "endDate": {
                      "type": "null"
                    },
                    "netPrice": {
                      "type": "number",
                      "sample": 2000
                    },
                    "roomUuid": {
                      "type": "string",
                      "sample": "0244eeee-8210-4c9e-8a5e-decfee04e09f"
                    },
                    "startDate": {
                      "type": "object",
                      "properties": {
                        "year": {
                          "type": "number",
                          "sample": 2025
                        },
                        "month": {
                          "type": "number",
                          "sample": 3
                        },
                        "day": {
                          "type": "number",
                          "sample": 1
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Date"
                        }
                      }
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "RoomNonHealthcareSystemCharge"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListRoomNonHealthcareSystemChargesResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListRoomsInAllWards

**Hash**: `49ec40bc02119618620e858698f30c1cb52d00d704ec0792dfda1fff43f5a8e4`

### Variables

```json
{
  "type": "object",
  "properties": {}
}
```

### Response Schema

```json

```

---

## ListScheduledOrders

**Hash**: `22e233a738a6e9e43bbfce67d217dfe6ca66222c1589a7eb16fc027e4129eff5`

### Variables

```json
{
  "input": {
    "filterOrderTypes": "[]",
    "accountingOrderExtendedShinryoShikibetsus": "[]",
    "filterDoctorUuid": {
      "value": "string"
    },
    "filterWardUuids": "[]",
    "filterRoomUuids": "[]",
    "patientCareType": "string",
    "sectionDate": {
      "year": "number",
      "month": "number",
      "day": "number"
    },
    "pageSize": "number",
    "pageToken": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listScheduledOrders": {
          "type": "object",
          "properties": {
            "executionDatePatientOrders": {
              "type": "array",
              "length": 10,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "patient": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
                        },
                        "serialNumber": {
                          "type": "string",
                          "sample": "00001"
                        },
                        "serialNumberPrefix": {
                          "type": "string",
                          "sample": ""
                        },
                        "fullName": {
                          "type": "string",
                          "sample": "テスト 1"
                        },
                        "fullNamePhonetic": {
                          "type": "string",
                          "sample": "テスト イチ"
                        },
                        "isDraft": {
                          "type": "boolean",
                          "sample": false
                        },
                        "isTestPatient": {
                          "type": "boolean",
                          "sample": true
                        },
                        "detail": {
                          "type": "object",
                          "properties": {
                            "patientUuid": {
                              "type": "string",
                              "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
                            },
                            "addressLine_1": {
                              "type": "string",
                              "sample": "香川県高松市テスト町"
                            },
                            "addressLine_2": {
                              "type": "string",
                              "sample": "てすとマンション"
                            },
                            "postalCode": {
                              "type": "string",
                              "sample": "123-4567"
                            },
                            "email": {
                              "type": "string",
                              "sample": "test1@test.com"
                            },
                            "phoneNumber": {
                              "type": "string",
                              "sample": "123456789"
                            },
                            "sexType": {
                              "type": "string",
                              "sample": "SEX_TYPE_MALE"
                            },
                            "birthDate": {
                              "type": "object",
                              "properties": {
                                "year": {
                                  "type": "number",
                                  "sample": 1975
                                },
                                "month": {
                                  "type": "number",
                                  "sample": 9
                                },
                                "day": {
                                  "type": "number",
                                  "sample": 18
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "Date"
                                }
                              }
                            },
                            "memo": {
                              "type": "string",
                              "sample": "急変時は日赤に搬送希望あり"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "PatientDetail"
                            }
                          }
                        },
                        "tags": {
                          "type": "array",
                          "length": 2,
                          "items": [
                            {
                              "type": "string",
                              "sample": "test"
                            }
                          ]
                        },
                        "attentionSummary": {
                          "type": "object",
                          "properties": {
                            "hasAnyInfection": {
                              "type": "boolean",
                              "sample": false
                            },
                            "hasAnyAllergy": {
                              "type": "boolean",
                              "sample": false
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "PatientAttentionSummary"
                            }
                          }
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Patient"
                        }
                      }
                    },
                    "orders": {
                      "type": "array",
                      "length": 11,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "e498463d-3212-4c76-8042-febdc2095a5f"
                            },
                            "orderType": {
                              "type": "string",
                              "sample": "ORDER_TYPE_PRESCRIPTION"
                            },
                            "order": {
                              "type": "object",
                              "properties": {
                                "uuid": {
                                  "type": "string",
                                  "sample": "e498463d-3212-4c76-8042-febdc2095a5f"
                                },
                                "imagingOrder": {
                                  "type": "null"
                                },
                                "nutritionOrder": {
                                  "type": "null"
                                },
                                "biopsyInspectionOrder": {
                                  "type": "null"
                                },
                                "specimenInspectionOrder": {
                                  "type": "null"
                                },
                                "rehabilitationOrder": {
                                  "type": "null"
                                },
                                "prescriptionOrderV2": {
                                  "type": "object",
                                  "properties": {
                                    "createTime": {
                                      "type": "max_depth"
                                    },
                                    "createUser": {
                                      "type": "max_depth"
                                    },
                                    "doctor": {
                                      "type": "max_depth"
                                    },
                                    "doctorUuid": {
                                      "type": "max_depth"
                                    },
                                    "medicationCategory": {
                                      "type": "max_depth"
                                    },
                                    "narcoticPractitioner": {
                                      "type": "max_depth"
                                    },
                                    "narcoticPractitionerUuid": {
                                      "type": "max_depth"
                                    },
                                    "note": {
                                      "type": "max_depth"
                                    },
                                    "orderStatus": {
                                      "type": "max_depth"
                                    },
                                    "patient": {
                                      "type": "max_depth"
                                    },
                                    "patientUuid": {
                                      "type": "max_depth"
                                    },
                                    "revokeDescription": {
                                      "type": "max_depth"
                                    },
                                    "rps": {
                                      "type": "max_depth"
                                    },
                                    "startDate": {
                                      "type": "max_depth"
                                    },
                                    "updateTime": {
                                      "type": "max_depth"
                                    },
                                    "updateUser": {
                                      "type": "max_depth"
                                    },
                                    "uuid": {
                                      "type": "max_depth"
                                    },
                                    "encounterId": {
                                      "type": "max_depth"
                                    },
                                    "extendedInsuranceCombinationId": {
                                      "type": "max_depth"
                                    },
                                    "isDraft": {
                                      "type": "max_depth"
                                    },
                                    "isOutpatient": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "injectionOrderV2": {
                                  "type": "null"
                                },
                                "accountingOrder": {
                                  "type": "null"
                                },
                                "specimenInspectionOrderV2": {
                                  "type": "null"
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "Order_order"
                                }
                              }
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "Order"
                            }
                          }
                        }
                      ]
                    },
                    "finalizedLatestOrders": {
                      "type": "array",
                      "length": 2,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "9b16484a-a458-42be-a396-8d0fde3c3c9f"
                            },
                            "orderType": {
                              "type": "string",
                              "sample": "ORDER_TYPE_PRESCRIPTION"
                            },
                            "order": {
                              "type": "object",
                              "properties": {
                                "uuid": {
                                  "type": "string",
                                  "sample": "9b16484a-a458-42be-a396-8d0fde3c3c9f"
                                },
                                "imagingOrder": {
                                  "type": "null"
                                },
                                "nutritionOrder": {
                                  "type": "null"
                                },
                                "biopsyInspectionOrder": {
                                  "type": "null"
                                },
                                "specimenInspectionOrder": {
                                  "type": "null"
                                },
                                "rehabilitationOrder": {
                                  "type": "null"
                                },
                                "prescriptionOrderV2": {
                                  "type": "object",
                                  "properties": {
                                    "createTime": {
                                      "type": "max_depth"
                                    },
                                    "createUser": {
                                      "type": "max_depth"
                                    },
                                    "doctor": {
                                      "type": "max_depth"
                                    },
                                    "doctorUuid": {
                                      "type": "max_depth"
                                    },
                                    "medicationCategory": {
                                      "type": "max_depth"
                                    },
                                    "narcoticPractitioner": {
                                      "type": "max_depth"
                                    },
                                    "narcoticPractitionerUuid": {
                                      "type": "max_depth"
                                    },
                                    "note": {
                                      "type": "max_depth"
                                    },
                                    "orderStatus": {
                                      "type": "max_depth"
                                    },
                                    "patient": {
                                      "type": "max_depth"
                                    },
                                    "patientUuid": {
                                      "type": "max_depth"
                                    },
                                    "revokeDescription": {
                                      "type": "max_depth"
                                    },
                                    "rps": {
                                      "type": "max_depth"
                                    },
                                    "startDate": {
                                      "type": "max_depth"
                                    },
                                    "updateTime": {
                                      "type": "max_depth"
                                    },
                                    "updateUser": {
                                      "type": "max_depth"
                                    },
                                    "uuid": {
                                      "type": "max_depth"
                                    },
                                    "encounterId": {
                                      "type": "max_depth"
                                    },
                                    "extendedInsuranceCombinationId": {
                                      "type": "max_depth"
                                    },
                                    "isDraft": {
                                      "type": "max_depth"
                                    },
                                    "isOutpatient": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "injectionOrderV2": {
                                  "type": "null"
                                },
                                "accountingOrder": {
                                  "type": "null"
                                },
                                "specimenInspectionOrderV2": {
                                  "type": "null"
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "Order_order"
                                }
                              }
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "Order"
                            }
                          }
                        }
                      ]
                    },
                    "executionDateHospitalizationLocation": {
                      "type": "null"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "ExecutionDatePatientOrders"
                    }
                  }
                }
              ]
            },
            "nextPageToken": {
              "type": "string",
              "sample": "10"
            },
            "__typename": {
              "type": "string",
              "sample": "ListScheduledOrdersResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListScheduledToEntryHospitalizations

**Hash**: `75de85a9813f6b90aca3cff057d93729745fba29b3f9c42c6a1539e809aaea5a`

### Variables

```json
{
  "input": {
    "wardId": {
      "value": "string"
    },
    "roomId": [
      "string"
    ],
    "pageSize": "number",
    "pageToken": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listScheduledToEntryHospitalizations": {
          "type": "object",
          "properties": {
            "hospitalizations": {
              "type": "array",
              "length": 3,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "ed6728e8-04ea-4767-a0b8-393babdfdb87"
                    },
                    "state": {
                      "type": "string",
                      "sample": "WILL_ADMIT"
                    },
                    "departmentTransferType": {
                      "type": "string",
                      "sample": "0"
                    },
                    "routeType": {
                      "type": "null"
                    },
                    "referralType": {
                      "type": "null"
                    },
                    "startDate": {
                      "type": "object",
                      "properties": {
                        "year": {
                          "type": "number",
                          "sample": 2026
                        },
                        "month": {
                          "type": "number",
                          "sample": 1
                        },
                        "day": {
                          "type": "number",
                          "sample": 6
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Date"
                        }
                      }
                    },
                    "endDate": {
                      "type": "null"
                    },
                    "patient": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "764e7657-e5cf-4c19-aeaa-8e8a722e7d82"
                        },
                        "serialNumber": {
                          "type": "string",
                          "sample": "20186"
                        },
                        "serialNumberPrefix": {
                          "type": "string",
                          "sample": ""
                        },
                        "fullName": {
                          "type": "string",
                          "sample": "安本 佐惠子"
                        },
                        "fullNamePhonetic": {
                          "type": "string",
                          "sample": "ヤスモト サエコ"
                        },
                        "isDraft": {
                          "type": "boolean",
                          "sample": false
                        },
                        "isTestPatient": {
                          "type": "boolean",
                          "sample": false
                        },
                        "detail": {
                          "type": "object",
                          "properties": {
                            "patientUuid": {
                              "type": "string",
                              "sample": "764e7657-e5cf-4c19-aeaa-8e8a722e7d82"
                            },
                            "addressLine_1": {
                              "type": "string",
                              "sample": "香川県東かがわ市引田2713-1"
                            },
                            "addressLine_2": {
                              "type": "string",
                              "sample": ""
                            },
                            "postalCode": {
                              "type": "string",
                              "sample": "769-2901"
                            },
                            "email": {
                              "type": "string",
                              "sample": ""
                            },
                            "phoneNumber": {
                              "type": "string",
                              "sample": "0879-33-2664"
                            },
                            "sexType": {
                              "type": "string",
                              "sample": "SEX_TYPE_FEMALE"
                            },
                            "birthDate": {
                              "type": "object",
                              "properties": {
                                "year": {
                                  "type": "number",
                                  "sample": 1951
                                },
                                "month": {
                                  "type": "number",
                                  "sample": 10
                                },
                                "day": {
                                  "type": "number",
                                  "sample": 27
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "Date"
                                }
                              }
                            },
                            "memo": {
                              "type": "string",
                              "sample": ""
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "PatientDetail"
                            }
                          }
                        },
                        "tags": {
                          "type": "array",
                          "items": "empty"
                        },
                        "attentionSummary": {
                          "type": "object",
                          "properties": {
                            "hasAnyInfection": {
                              "type": "boolean",
                              "sample": false
                            },
                            "hasAnyAllergy": {
                              "type": "boolean",
                              "sample": false
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "PatientAttentionSummary"
                            }
                          }
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Patient"
                        }
                      }
                    },
                    "hospitalizationDoctor": {
                      "type": "object",
                      "properties": {
                        "doctor": {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "3ab728f6-bc2a-4630-a0c0-b4e67b8b727f"
                            },
                            "name": {
                              "type": "string",
                              "sample": "宇都宮 　栄"
                            },
                            "namePhonetic": {
                              "type": "object",
                              "properties": {
                                "__typename": {
                                  "type": "string",
                                  "sample": "StringValue"
                                },
                                "value": {
                                  "type": "string",
                                  "sample": "ウツノミヤ サカエ"
                                }
                              }
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "User"
                            }
                          }
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "HospitalizationDoctor"
                        }
                      }
                    },
                    "hospitalizationDayCount": {
                      "type": "null"
                    },
                    "lastHospitalizationLocationUuid": {
                      "type": "string",
                      "sample": "3a31d0c7-8eb0-4ca5-81c2-6f2bc81443a3"
                    },
                    "statusHospitalizationLocation": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "3a31d0c7-8eb0-4ca5-81c2-6f2bc81443a3"
                        },
                        "hospitalizationUuid": {
                          "type": "string",
                          "sample": "ed6728e8-04ea-4767-a0b8-393babdfdb87"
                        },
                        "wardUuid": {
                          "type": "object",
                          "properties": {
                            "value": {
                              "type": "string",
                              "sample": "e7c51602-9d76-4800-a2ee-02b5d50d51fd"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "StringValue"
                            }
                          }
                        },
                        "roomUuid": {
                          "type": "object",
                          "properties": {
                            "value": {
                              "type": "string",
                              "sample": "dbc32d6b-3833-4a57-9a75-1be2b6298690"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "StringValue"
                            }
                          }
                        },
                        "transferDate": {
                          "type": "object",
                          "properties": {
                            "year": {
                              "type": "number",
                              "sample": 2026
                            },
                            "month": {
                              "type": "number",
                              "sample": 1
                            },
                            "day": {
                              "type": "number",
                              "sample": 6
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "Date"
                            }
                          }
                        },
                        "transferTime": {
                          "type": "object",
                          "properties": {
                            "hours": {
                              "type": "number",
                              "sample": 10
                            },
                            "minutes": {
                              "type": "number",
                              "sample": 30
                            },
                            "seconds": {
                              "type": "number",
                              "sample": 0
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "Time"
                            }
                          }
                        },
                        "ward": {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "e7c51602-9d76-4800-a2ee-02b5d50d51fd"
                            },
                            "name": {
                              "type": "string",
                              "sample": "一般病棟"
                            },
                            "nameKana": {
                              "type": "string",
                              "sample": "イッパンビョウトウ"
                            },
                            "receiptWardType": {
                              "type": "string",
                              "sample": "GENERAL"
                            },
                            "wardCode": {
                              "type": "object",
                              "properties": {
                                "value": {
                                  "type": "string",
                                  "sample": "190620001"
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "StringValue"
                                }
                              }
                            },
                            "isCommunityBasedCare": {
                              "type": "boolean",
                              "sample": false
                            },
                            "isKanwaCare": {
                              "type": "boolean",
                              "sample": false
                            },
                            "isKaigoIryouin": {
                              "type": "boolean",
                              "sample": false
                            },
                            "bedType": {
                              "type": "string",
                              "sample": "GENERAL_BEDS"
                            },
                            "ff1WardType": {
                              "type": "string",
                              "sample": "FF1_WARD_TYPE_GENERAL"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "Ward"
                            }
                          }
                        },
                        "room": {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "dbc32d6b-3833-4a57-9a75-1be2b6298690"
                            },
                            "wardUuid": {
                              "type": "string",
                              "sample": "e7c51602-9d76-4800-a2ee-02b5d50d51fd"
                            },
                            "name": {
                              "type": "string",
                              "sample": "569"
                            },
                            "isCommunityBasedCare": {
                              "type": "boolean",
                              "sample": false
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "Room"
                            }
                          }
                        },
                        "eventType": {
                          "type": "string",
                          "sample": "ADMISSION"
                        },
                        "hasCompleted": {
                          "type": "boolean",
                          "sample": false
                        },
                        "isCommunityBasedCareCalculationEnabled": {
                          "type": "boolean",
                          "sample": false
                        },
                        "isKanwaCareCalculationEnabled": {
                          "type": "boolean",
                          "sample": false
                        },
                        "roomNonHealthcareSystemChargePriceOverride": {
                          "type": "null"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "HospitalizationLocation"
                        }
                      }
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "Hospitalization"
                    }
                  }
                }
              ]
            },
            "nextPageToken": {
              "type": "string",
              "sample": "3"
            },
            "totalCount": {
              "type": "number",
              "sample": 4
            },
            "__typename": {
              "type": "string",
              "sample": "ListScheduledHospitalizationsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListScheduledToLeaveHospitalizations

**Hash**: `1b99d647f4e1798d8eda11330378d1a4575799a8860e5e145d54bfde13e5d7f5`

### Variables

```json
{
  "input": {
    "wardId": {
      "value": "string"
    },
    "roomId": [
      "string"
    ],
    "pageSize": "number",
    "pageToken": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listScheduledToLeaveHospitalizations": {
          "type": "object",
          "properties": {
            "hospitalizations": {
              "type": "array",
              "items": "empty"
            },
            "nextPageToken": {
              "type": "string",
              "sample": ""
            },
            "totalCount": {
              "type": "number",
              "sample": 0
            },
            "__typename": {
              "type": "string",
              "sample": "ListScheduledHospitalizationsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListSectionedOrdersInPatient

**Hash**: `ece851a35f1cff69291a787bfa34c5c2b3a085e4ddbe074f22f9e7b4dce39447`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "filterOrderStatus": {
          "type": "array",
          "length": 4,
          "items": [
            {
              "type": "string",
              "sample": "ORDER_STATUS_ACTIVE"
            }
          ]
        },
        "filterOrderTypes": {
          "type": "array",
          "length": 0,
          "items": "empty"
        },
        "patientCareType": {
          "type": "string",
          "sample": "PATIENT_CARE_TYPE_ANY"
        },
        "searchDate": {
          "type": "object",
          "properties": {
            "year": {
              "type": "number",
              "sample": 2025
            },
            "month": {
              "type": "number",
              "sample": 12
            },
            "day": {
              "type": "number",
              "sample": 31
            }
          }
        },
        "patientUuid": {
          "type": "string",
          "sample": "2bfecb0b-d770-4932-beb4-49c16e63ae8c"
        },
        "pageSize": {
          "type": "number",
          "sample": 7
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListSectionedScheduledOrdersInPatient

**Hash**: `622473c362597ba43557476444e862b6895e3d5daaeed4f9650dac5cf6dc2b0b`

### Variables

```json
{
  "input": {
    "filterOrderStatus": [
      "string"
    ],
    "filterOrderTypes": "[]",
    "patientCareType": "string",
    "searchDate": {
      "year": "number",
      "month": "number",
      "day": "number"
    },
    "patientUuid": "string",
    "pageSize": "number",
    "pageToken": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listSectionedScheduledOrdersInPatient": {
          "type": "object",
          "properties": {
            "sections": {
              "type": "array",
              "length": 7,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "sectionDate": {
                      "type": "object",
                      "properties": {
                        "year": {
                          "type": "number",
                          "sample": 2026
                        },
                        "month": {
                          "type": "number",
                          "sample": 1
                        },
                        "day": {
                          "type": "number",
                          "sample": 1
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Date"
                        }
                      }
                    },
                    "orders": {
                      "type": "array",
                      "length": 9,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "dff1628d-8bb3-4ad7-a98c-6becb1c6d169"
                            },
                            "orderType": {
                              "type": "string",
                              "sample": "ORDER_TYPE_REHABILITATION"
                            },
                            "order": {
                              "type": "object",
                              "properties": {
                                "uuid": {
                                  "type": "string",
                                  "sample": "dff1628d-8bb3-4ad7-a98c-6becb1c6d169"
                                },
                                "imagingOrder": {
                                  "type": "null"
                                },
                                "nutritionOrder": {
                                  "type": "null"
                                },
                                "biopsyInspectionOrder": {
                                  "type": "null"
                                },
                                "specimenInspectionOrder": {
                                  "type": "null"
                                },
                                "rehabilitationOrder": {
                                  "type": "object",
                                  "properties": {
                                    "uuid": {
                                      "type": "max_depth"
                                    },
                                    "patientUuid": {
                                      "type": "max_depth"
                                    },
                                    "patient": {
                                      "type": "max_depth"
                                    },
                                    "doctorUuid": {
                                      "type": "max_depth"
                                    },
                                    "orderStatus": {
                                      "type": "max_depth"
                                    },
                                    "startDate": {
                                      "type": "max_depth"
                                    },
                                    "endDate": {
                                      "type": "max_depth"
                                    },
                                    "prevEndDate": {
                                      "type": "max_depth"
                                    },
                                    "stopConfirmed": {
                                      "type": "max_depth"
                                    },
                                    "createTime": {
                                      "type": "max_depth"
                                    },
                                    "updateTime": {
                                      "type": "max_depth"
                                    },
                                    "detail": {
                                      "type": "max_depth"
                                    },
                                    "atLeastOneExecuted": {
                                      "type": "max_depth"
                                    },
                                    "doctor": {
                                      "type": "max_depth"
                                    },
                                    "createUser": {
                                      "type": "max_depth"
                                    },
                                    "updateUser": {
                                      "type": "max_depth"
                                    },
                                    "isDraft": {
                                      "type": "max_depth"
                                    },
                                    "isOutpatient": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "prescriptionOrderV2": {
                                  "type": "null"
                                },
                                "injectionOrderV2": {
                                  "type": "null"
                                },
                                "accountingOrder": {
                                  "type": "null"
                                },
                                "specimenInspectionOrderV2": {
                                  "type": "null"
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "Order_order"
                                }
                              }
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "Order"
                            }
                          }
                        }
                      ]
                    },
                    "finalizedLatestOrders": {
                      "type": "array",
                      "length": 4,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "e498463d-3212-4c76-8042-febdc2095a5f"
                            },
                            "orderType": {
                              "type": "string",
                              "sample": "ORDER_TYPE_PRESCRIPTION"
                            },
                            "order": {
                              "type": "object",
                              "properties": {
                                "uuid": {
                                  "type": "string",
                                  "sample": "e498463d-3212-4c76-8042-febdc2095a5f"
                                },
                                "imagingOrder": {
                                  "type": "null"
                                },
                                "nutritionOrder": {
                                  "type": "null"
                                },
                                "biopsyInspectionOrder": {
                                  "type": "null"
                                },
                                "specimenInspectionOrder": {
                                  "type": "null"
                                },
                                "rehabilitationOrder": {
                                  "type": "null"
                                },
                                "prescriptionOrderV2": {
                                  "type": "object",
                                  "properties": {
                                    "createTime": {
                                      "type": "max_depth"
                                    },
                                    "createUser": {
                                      "type": "max_depth"
                                    },
                                    "doctor": {
                                      "type": "max_depth"
                                    },
                                    "doctorUuid": {
                                      "type": "max_depth"
                                    },
                                    "medicationCategory": {
                                      "type": "max_depth"
                                    },
                                    "narcoticPractitioner": {
                                      "type": "max_depth"
                                    },
                                    "narcoticPractitionerUuid": {
                                      "type": "max_depth"
                                    },
                                    "note": {
                                      "type": "max_depth"
                                    },
                                    "orderStatus": {
                                      "type": "max_depth"
                                    },
                                    "patient": {
                                      "type": "max_depth"
                                    },
                                    "patientUuid": {
                                      "type": "max_depth"
                                    },
                                    "revokeDescription": {
                                      "type": "max_depth"
                                    },
                                    "rps": {
                                      "type": "max_depth"
                                    },
                                    "startDate": {
                                      "type": "max_depth"
                                    },
                                    "updateTime": {
                                      "type": "max_depth"
                                    },
                                    "updateUser": {
                                      "type": "max_depth"
                                    },
                                    "uuid": {
                                      "type": "max_depth"
                                    },
                                    "encounterId": {
                                      "type": "max_depth"
                                    },
                                    "extendedInsuranceCombinationId": {
                                      "type": "max_depth"
                                    },
                                    "isDraft": {
                                      "type": "max_depth"
                                    },
                                    "isOutpatient": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "injectionOrderV2": {
                                  "type": "null"
                                },
                                "accountingOrder": {
                                  "type": "null"
                                },
                                "specimenInspectionOrderV2": {
                                  "type": "null"
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "Order_order"
                                }
                              }
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "Order"
                            }
                          }
                        }
                      ]
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "OrderSection"
                    }
                  }
                }
              ]
            },
            "nextPageToken": {
              "type": "string",
              "sample": "20446"
            },
            "__typename": {
              "type": "string",
              "sample": "ListSectionedScheduledOrdersInPatientResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListSessions

**Hash**: `61f995646e2c72bf2a2eb020ddf725967ae32d2245224f7ecd8ec1d34f02a878`

### Variables

```json
{
  "input": {
    "date": {
      "day": "number",
      "month": "number",
      "year": "number"
    },
    "query": "string",
    "filterStates": "[]",
    "filterDoctorUuids": "[]",
    "filterPurposeOfVisitUuids": "[]",
    "pageSize": "number",
    "pageToken": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listSessions": {
          "type": "object",
          "properties": {
            "sessions": {
              "type": "array",
              "items": "empty"
            },
            "nextPageToken": {
              "type": "string",
              "sample": ""
            },
            "__typename": {
              "type": "string",
              "sample": "ListSessionsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListSimilarPatients

**Hash**: `ab4fd840eeb80d69ea56a0242d499ccf9acf0c401e50bcc34ab3171767f81b2f`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "fullName": {
          "type": "string",
          "sample": "テスト 1"
        },
        "fullNamePhonetic": {
          "type": "string",
          "sample": "テスト イチ"
        },
        "birthDate": {
          "type": "object",
          "properties": {
            "year": {
              "type": "number",
              "sample": 1975
            },
            "month": {
              "type": "number",
              "sample": 9
            },
            "day": {
              "type": "number",
              "sample": 18
            }
          }
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListSpecimenInspectionOrderHistories

**Hash**: `b575bd291c17f446a881c047e426942587aa096559095cc87ddebe686a04197b`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "specimenInspectionOrderUuid": {
          "type": "string",
          "sample": "b20449a2-c24f-45e0-ab37-1536860da48f"
        },
        "pageSize": {
          "type": "number",
          "sample": 100
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListSpecimenInspections

**Hash**: `9b42b34d4d780d65ccc58f511d7ba6d38150fbdf76a3b43d431f0976186515ef`

### Variables

```json
{
  "input": {
    "query": "string",
    "isOutpatient": "boolean"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listSpecimenInspections": {
          "type": "object",
          "properties": {
            "specimenInspections": {
              "type": "array",
              "length": 3,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "840780c1-6817-49c0-b224-7e94dc60cdbd"
                    },
                    "name": {
                      "type": "string",
                      "sample": "院内検体検査"
                    },
                    "outsideInspectionLaboratory": {
                      "type": "null"
                    },
                    "outsideInspectionLaboratoryUuid": {
                      "type": "null"
                    },
                    "codeTableItems": {
                      "type": "array",
                      "length": 45,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "codeTableItemAlphabet": {
                              "type": "string",
                              "sample": "D"
                            },
                            "codeTableItemSectionNumber": {
                              "type": "number",
                              "sample": 0
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "CodeTableItem"
                            }
                          }
                        }
                      ]
                    },
                    "searchCategories": {
                      "type": "array",
                      "items": "empty"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "SpecimenInspection"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListSpecimenInspectionsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListSurgeryDocuments

**Hash**: `49e84423942a84bd426cba938a205e2737799e560caf0f7521436a985d35b780`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
        },
        "pageSize": {
          "type": "number",
          "sample": 100
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListSurgeryDocumentTemplates

**Hash**: `c61664cb2e3d78a23d2435a11a44b001c2528ca712e9a852f09218749f1ffd85`

### Variables

```json
{
  "input": {
    "query": "string",
    "searchDate": {
      "year": "number",
      "month": "number",
      "day": "number"
    },
    "pageSize": "number",
    "pageToken": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listSurgeryDocumentTemplates": {
          "type": "object",
          "properties": {
            "surgeryDocumentTemplates": {
              "type": "array",
              "items": "empty"
            },
            "nextPageToken": {
              "type": "string",
              "sample": ""
            },
            "__typename": {
              "type": "string",
              "sample": "ListSurgeryDocumentTemplatesResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListSymptomDescriptions

**Hash**: `3d8bda155dea617df09c09f5d9ef35637e8892a6f28f2ce6f081d4b5af2cd677`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "patientUuid": {
          "type": "string",
          "sample": "2bfecb0b-d770-4932-beb4-49c16e63ae8c"
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListUnscheduledRoomsHospitalizations

**Hash**: `385c598ecbf18dae07020362ebc0a9c3458089d054b933cdd1465242f72ea8a3`

### Variables

```json
{
  "input": {
    "wardId": {
      "value": "string"
    },
    "pageSize": "number",
    "pageToken": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listUnscheduledRoomsHospitalizations": {
          "type": "object",
          "properties": {
            "hospitalizations": {
              "type": "array",
              "items": "empty"
            },
            "nextPageToken": {
              "type": "string",
              "sample": ""
            },
            "totalCount": {
              "type": "number",
              "sample": 0
            },
            "__typename": {
              "type": "string",
              "sample": "ListScheduledHospitalizationsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListUserClinicalRecordViewFilters

**Hash**: `62cee82b874affcf2cfbbb21463d059ef8c82cbaa36b670e4a912dd569fa4d00`

### Variables

```json
{
  "type": "object",
  "properties": {}
}
```

### Response Schema

```json

```

---

## ListUsers

**Hash**: `8a8291de67b7c64c15b896e18df8a725b398615816b65e789b1a798557f9d785`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "role": {
          "type": "string",
          "sample": "DOCTOR"
        },
        "onlyNarcoticPractitioner": {
          "type": "boolean",
          "sample": false
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## ListWardOccupancy

**Hash**: `365c56183990e9355f0e0228bbb8a3569646a61797cb280bb5f58467e5a8943b`

### Variables

```json
{
  "input": {
    "searchDate": {
      "year": "number",
      "month": "number",
      "day": "number"
    }
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "listWardOccupancies": {
          "type": "object",
          "properties": {
            "wardOccupancies": {
              "type": "array",
              "length": 2,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "ward": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "e7c51602-9d76-4800-a2ee-02b5d50d51fd"
                        },
                        "name": {
                          "type": "string",
                          "sample": "一般病棟"
                        },
                        "nameKana": {
                          "type": "string",
                          "sample": "イッパンビョウトウ"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Ward"
                        }
                      }
                    },
                    "roomStayCount": {
                      "type": "array",
                      "length": 22,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "room": {
                              "type": "object",
                              "properties": {
                                "uuid": {
                                  "type": "string",
                                  "sample": "47d45d67-d317-42b5-b524-939f9b344d7c"
                                },
                                "name": {
                                  "type": "string",
                                  "sample": "451"
                                },
                                "wardUuid": {
                                  "type": "string",
                                  "sample": "e7c51602-9d76-4800-a2ee-02b5d50d51fd"
                                },
                                "memo": {
                                  "type": "string",
                                  "sample": ""
                                },
                                "bedCount": {
                                  "type": "number",
                                  "sample": 2
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "Room"
                                }
                              }
                            },
                            "stayCount": {
                              "type": "number",
                              "sample": 1
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "RoomStayCount"
                            }
                          }
                        }
                      ]
                    },
                    "occupancyRate": {
                      "type": "number",
                      "sample": 0.5170000195503235
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "WardOccupancy"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListWardOccupanciesResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListWards

**Hash**: `c122e13ee17854b0deef6e0c1529aae4166e36bf76c95abc3c750dfa8f235c70`

### Variables

```json
{
  "type": "object",
  "properties": {}
}
```

### Response Schema

```json

```

---

## LockOAEditor

**Hash**: `b3a50db8fde184fe13f14427ba21a91f47c0c125b894ac9af2db1aeb255690cd`

### Variables

```json
{
  "input": {
    "outpatientAccountingId": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "sendEditingBeaconOnOutpatientAccounting": {
          "type": "object",
          "properties": {
            "lockAcquired": {
              "type": "boolean",
              "sample": true
            },
            "__typename": {
              "type": "string",
              "sample": "SendEditingBeaconOnOutpatientAccountingOutput"
            }
          }
        }
      }
    }
  }
}
```

---

## NursingPlanTemplates

**Hash**: `dc856a68fe99c69810758f104e54f4dd1f6197641b40ebf395366792bcdeb898`

### Variables

```json
{
  "input": {
    "query": "string",
    "pageSize": "number",
    "pageToken": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "errors": {
      "type": "array",
      "length": 1,
      "items": [
        {
          "type": "object",
          "properties": {
            "message": {
              "type": "string",
              "sample": "PersistedQueryNotFound"
            },
            "locations": {
              "type": "array",
              "items": "empty"
            },
            "extensions": {
              "type": "object",
              "properties": {
                "persistedQueryId": {
                  "type": "string",
                  "sample": "dc856a68fe99c69810758f104e54f4dd1f6197641b40ebf395..."
                },
                "generatedBy": {
                  "type": "string",
                  "sample": "graphql-java"
                }
              }
            }
          }
        }
      ]
    }
  }
}
```

---

## OutpatientAccountingCost

**Hash**: `8c36f5d99166eef6803a028a3aa1f74f6cc10737cb8ea34114c833154d6561aa`

### Variables

```json
{
  "outpatientAccountingId": "string"
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "outpatientAccounting": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "sample": "21916fa6-e527-11f0-86c4-01d6be709867"
            },
            "sessionId": {
              "type": "string",
              "sample": "2cd4de29-a76a-405a-907e-bfd2dfc52a20"
            },
            "scheduleTime": {
              "type": "string",
              "sample": "2025-12-29T22:52:07Z"
            },
            "consultationDate": {
              "type": "string",
              "sample": "2025-12-30"
            },
            "session": {
              "type": "object",
              "properties": {
                "purposeOfVisit": {
                  "type": "object",
                  "properties": {
                    "title": {
                      "type": "string",
                      "sample": "整形外科"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "PurposeOfVisit"
                    }
                  }
                },
                "doctor": {
                  "type": "object",
                  "properties": {
                    "departmentName": {
                      "type": "string",
                      "sample": "整形外科"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "User"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "OutpatientAccountingSession"
                }
              }
            },
            "__typename": {
              "type": "string",
              "sample": "OutpatientAccounting"
            },
            "cost": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string",
                  "sample": "bfaae0ab-0ce3-49d7-a6c0-8e1110dc6944"
                },
                "updateTime": {
                  "type": "string",
                  "sample": "2025-12-30T02:30:02.928444Z"
                },
                "outpatientAccountingId": {
                  "type": "string",
                  "sample": "21916fa6-e527-11f0-86c4-01d6be709867"
                },
                "confirmed": {
                  "type": "boolean",
                  "sample": true
                },
                "latest": {
                  "type": "boolean",
                  "sample": true
                },
                "totalPoint": {
                  "type": "string",
                  "sample": "200.0000"
                },
                "body": {
                  "type": "object",
                  "properties": {
                    "calculationUnits": {
                      "type": "array",
                      "length": 7,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "id": {
                              "type": "string",
                              "sample": "9617dcf2-edfe-403d-8327-a820db4127a7"
                            },
                            "unitType": {
                              "type": "string",
                              "sample": "12"
                            },
                            "extendedInsuranceCombinationHrn": {
                              "type": "string",
                              "sample": "//master.henry-app.jp/insuranceCombination/ebda2a5..."
                            },
                            "insuranceCombination": {
                              "type": "object",
                              "properties": {
                                "id": {
                                  "type": "string",
                                  "sample": "//master.henry-app.jp/insuranceCombination/ebda2a5..."
                                },
                                "displayName": {
                                  "type": "string",
                                  "sample": "生活保護"
                                },
                                "shortDisplayName": {
                                  "type": "string",
                                  "sample": "生活保護"
                                },
                                "healthInsuranceSystem": {
                                  "type": "null"
                                },
                                "publicSubsidySystem1": {
                                  "type": "null"
                                },
                                "publicSubsidySystem2": {
                                  "type": "null"
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "ExtendedInsuranceCombination"
                                }
                              }
                            },
                            "medicalFee": {
                              "type": "object",
                              "properties": {
                                "count": {
                                  "type": "number",
                                  "sample": 1
                                },
                                "medicalFeeUnitType": {
                                  "type": "string",
                                  "sample": "POINT"
                                },
                                "totalValue": {
                                  "type": "string",
                                  "sample": "76.0000"
                                },
                                "value": {
                                  "type": "string",
                                  "sample": "76.0000"
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "OutpatientAccountingCostUnitMedicalFee"
                                }
                              }
                            },
                            "contents": {
                              "type": "array",
                              "length": 2,
                              "items": [
                                {
                                  "type": "object",
                                  "properties": {
                                    "id": {
                                      "type": "max_depth"
                                    },
                                    "metadata": {
                                      "type": "max_depth"
                                    },
                                    "medicalFee": {
                                      "type": "max_depth"
                                    },
                                    "value": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                }
                              ]
                            },
                            "count": {
                              "type": "number",
                              "sample": 1
                            },
                            "prescriptionDetail": {
                              "type": "null"
                            },
                            "defaultPrescriptionDetail": {
                              "type": "object",
                              "properties": {
                                "prescriptionSystem": {
                                  "type": "number",
                                  "sample": 2
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "OutpatientAccountingPrescriptionDetail"
                                }
                              }
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "OutpatientAccountingCostUnit"
                            }
                          }
                        }
                      ]
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "OutpatientAccountingCostBody"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "OutpatientAccountingCost"
                }
              }
            },
            "billing": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string",
                  "sample": "49fa495d-e527-11f0-bbae-09cae673facd"
                },
                "currentInvoice": {
                  "type": "object",
                  "properties": {
                    "id": {
                      "type": "string",
                      "sample": "7255db97-e527-11f0-9704-5b5723f487bc"
                    },
                    "createTime": {
                      "type": "string",
                      "sample": "2025-12-30T02:30:03.483062Z"
                    },
                    "totalPatientBurden": {
                      "type": "number",
                      "sample": 0
                    },
                    "insuredHealthcareSystemConsultationPatientBurdenAmount": {
                      "type": "number",
                      "sample": 0
                    },
                    "selfPaidHealthcareSystemConsultationPatientBurdenAmount": {
                      "type": "null"
                    },
                    "taxedNonHealthcareSystemConsultationCanUseWithHealthcareSystemPatientBurdenAmount": {
                      "type": "null"
                    },
                    "taxedNonHealthcareSystemConsultationCannotUseWithHealthcareSystemPatientBurdenAmount": {
                      "type": "null"
                    },
                    "statementUrl": {
                      "type": "string",
                      "sample": "https://storage.googleapis.com/henry-files-product..."
                    },
                    "invoiceUrl": {
                      "type": "string",
                      "sample": "https://example.com"
                    },
                    "hasPreviousInvoice": {
                      "type": "boolean",
                      "sample": true
                    },
                    "discountRate": {
                      "type": "null"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "OutpatientAccountingInvoice"
                    }
                  }
                },
                "isConfirmed": {
                  "type": "boolean",
                  "sample": true
                },
                "isSettled": {
                  "type": "boolean",
                  "sample": true
                },
                "hasPayment": {
                  "type": "boolean",
                  "sample": true
                },
                "canDeleteInvoice": {
                  "type": "boolean",
                  "sample": false
                },
                "canCreateIgnoredDifference": {
                  "type": "boolean",
                  "sample": false
                },
                "canResetPayment": {
                  "type": "boolean",
                  "sample": true
                },
                "canDeleteIgnoredDifference": {
                  "type": "boolean",
                  "sample": false
                },
                "canViewInvoice": {
                  "type": "boolean",
                  "sample": false
                },
                "bulkSessionPaymentId": {
                  "type": "null"
                },
                "receiptUrl": {
                  "type": "string",
                  "sample": "https://example.com"
                },
                "totalReceiveAmount": {
                  "type": "number",
                  "sample": 0
                },
                "outstandingAmount": {
                  "type": "null"
                },
                "overpaidAmount": {
                  "type": "null"
                },
                "ignoredDifferenceAmount": {
                  "type": "null"
                },
                "__typename": {
                  "type": "string",
                  "sample": "OutpatientAccountingBilling"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

---

## OutpatientAccountingEncounters

**Hash**: `1970299b4437b6edf50b9715eeb95dc881b9fbbb6c24f0b53c6881ff34aaadd5`

### Variables

```json
{
  "input": {
    "outpatientAccountingId": "string",
    "filterCondition": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "outpatientAccountingEncounters": {
          "type": "object",
          "properties": {
            "encounters": {
              "type": "array",
              "length": 1,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "id": {
                      "type": "string",
                      "sample": "f6cbc38f-eeae-4efc-903b-55b02ea0ab99"
                    },
                    "records": {
                      "type": "array",
                      "length": 3,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "id": {
                              "type": "string",
                              "sample": "//henry-app.jp/encounterRecord/progressNote/e11a3e..."
                            },
                            "current": {
                              "type": "object",
                              "properties": {
                                "id": {
                                  "type": "string",
                                  "sample": "e11a3e15-3be2-4508-8e00-9f2424f13ab0"
                                },
                                "encounterId": {
                                  "type": "string",
                                  "sample": "f6cbc38f-eeae-4efc-903b-55b02ea0ab99"
                                },
                                "isDraft": {
                                  "type": "boolean",
                                  "sample": false
                                },
                                "isApproved": {
                                  "type": "boolean",
                                  "sample": true
                                },
                                "isDeleted": {
                                  "type": "boolean",
                                  "sample": false
                                },
                                "version": {
                                  "type": "number",
                                  "sample": 1
                                },
                                "extendedInsuranceCombinationId": {
                                  "type": "null"
                                },
                                "insuranceCombination": {
                                  "type": "object",
                                  "properties": {
                                    "id": {
                                      "type": "max_depth"
                                    },
                                    "displayName": {
                                      "type": "max_depth"
                                    },
                                    "shortDisplayName": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "updateTime": {
                                  "type": "string",
                                  "sample": "2025-12-30T02:25:07.980408Z"
                                },
                                "updateUser": {
                                  "type": "object",
                                  "properties": {
                                    "id": {
                                      "type": "max_depth"
                                    },
                                    "name": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "createTime": {
                                  "type": "string",
                                  "sample": "2025-12-28T22:52:20.945095Z"
                                },
                                "createUser": {
                                  "type": "object",
                                  "properties": {
                                    "id": {
                                      "type": "max_depth"
                                    },
                                    "name": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "ProgressNote"
                                },
                                "title": {
                                  "type": "string",
                                  "sample": "外来診療録"
                                },
                                "editorData": {
                                  "type": "string",
                                  "sample": "{\"blocks\":[{\"key\":\"fafhn\",\"type\":\"unstyled\",\"text\"..."
                                }
                              }
                            },
                            "excludedFromSyncTarget": {
                              "type": "boolean",
                              "sample": false
                            },
                            "syncStatus": {
                              "type": "null"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "OutpatientAccountingEncounterRecord"
                            }
                          }
                        }
                      ]
                    },
                    "patientId": {
                      "type": "string",
                      "sample": "19779efe-e25a-444d-9440-2538cbfaca63"
                    },
                    "firstPublishTime": {
                      "type": "string",
                      "sample": "2025-12-28T22:52:20.898995Z"
                    },
                    "basedOn": {
                      "type": "array",
                      "length": 1,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "2cd4de29-a76a-405a-907e-bfd2dfc52a20"
                            },
                            "purposeOfVisit": {
                              "type": "object",
                              "properties": {
                                "id": {
                                  "type": "string",
                                  "sample": "acdfdb0a-b7d2-4fad-96d9-fc6bb96a8c77"
                                },
                                "title": {
                                  "type": "string",
                                  "sample": "整形外科"
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "PurposeOfVisit"
                                }
                              }
                            },
                            "scheduleTime": {
                              "type": "string",
                              "sample": "2025-12-29T22:52:07Z"
                            },
                            "patientId": {
                              "type": "string",
                              "sample": "19779efe-e25a-444d-9440-2538cbfaca63"
                            },
                            "patient": {
                              "type": "object",
                              "properties": {
                                "id": {
                                  "type": "string",
                                  "sample": "19779efe-e25a-444d-9440-2538cbfaca63"
                                },
                                "fullName": {
                                  "type": "string",
                                  "sample": "植村 隆義"
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "Patient"
                                }
                              }
                            },
                            "doctorId": {
                              "type": "string",
                              "sample": "5bbead66-558f-4382-a46d-140e9a304e4b"
                            },
                            "doctor": {
                              "type": "object",
                              "properties": {
                                "id": {
                                  "type": "string",
                                  "sample": "5bbead66-558f-4382-a46d-140e9a304e4b"
                                },
                                "name": {
                                  "type": "string",
                                  "sample": "満岡 　弘巳"
                                },
                                "departmentName": {
                                  "type": "string",
                                  "sample": "整形外科"
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "User"
                                }
                              }
                            },
                            "state": {
                              "type": "string",
                              "sample": "AFTER_PAYMENT"
                            },
                            "visitTime": {
                              "type": "string",
                              "sample": "2025-12-30T01:48:18.880345Z"
                            },
                            "deleteTime": {
                              "type": "null"
                            },
                            "outpatientAccounting": {
                              "type": "object",
                              "properties": {
                                "id": {
                                  "type": "string",
                                  "sample": "21916fa6-e527-11f0-86c4-01d6be709867"
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "OutpatientAccounting"
                                }
                              }
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "Session"
                            }
                          }
                        }
                      ]
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "OutpatientAccountingEncounter"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "OutpatientAccountingEncounterList"
            }
          }
        }
      }
    }
  }
}
```

---

## OutpatientAccountingPatientBurdenValidationReports

**Hash**: `17176eec7cd03137aa6d611cdd9413c3145612eb3c5d968dc2000176404f3b22`

### Variables

```json
{
  "outpatientAccountingId": "string"
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "outpatientAccountingPatientBurdenValidationReports": {
          "type": "object",
          "properties": {
            "reports": {
              "type": "array",
              "items": "empty"
            },
            "__typename": {
              "type": "string",
              "sample": "OutpatientAccountingPatientBurdenValidationReports..."
            }
          }
        }
      }
    }
  }
}
```

---

## OutpatientAccountingUnSyncedEncounterCounts

**Hash**: `4a6e088b0667927c05ae54fd56d0b1cd36b54c336e84dae6d96c923d0a4f88c6`

### Variables

```json
{
  "outpatientAccountingId": "string"
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "outpatientAccountingUnSyncedEncounterCounts": {
          "type": "object",
          "properties": {
            "unsyncedCount": {
              "type": "number",
              "sample": 0
            },
            "updatedCount": {
              "type": "number",
              "sample": 0
            },
            "__typename": {
              "type": "string",
              "sample": "OutpatientAccountingUnsyncedEncounterCounts"
            }
          }
        }
      }
    }
  }
}
```

---

## OutpatientProblemReport

**Hash**: `743a269c922ff834309c35fcc85ea07eed271e90eec7bbf6ea95db4dd788532d`

### Variables

```json
{
  "id": "string"
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "outpatientProblemReport": {
          "type": "object",
          "properties": {
            "reports": {
              "type": "array",
              "length": 3,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "hint": {
                      "type": "null"
                    },
                    "level": {
                      "type": "string",
                      "sample": "INFO"
                    },
                    "message": {
                      "type": "string",
                      "sample": "再診料に必要な選択式コメントが入力されているか確認してください"
                    },
                    "targets": {
                      "type": "array",
                      "length": 1,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "id": {
                              "type": "string",
                              "sample": "9617dcf2-edfe-403d-8327-a820db4127a7"
                            },
                            "type": {
                              "type": "string",
                              "sample": "CostUnit"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "CostUnit"
                            }
                          }
                        }
                      ]
                    },
                    "indicationMetadata": {
                      "type": "null"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "OutpatientProblemReport"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListOutpatientProblemReportOutput"
            }
          }
        }
      }
    }
  }
}
```

---

## RecordAnalyticalEvent

**Hash**: `55ce35a36461f2283a7b15d3858fd002d21f8ab78c52734d3b389244fada2d84`

### Variables

```json
{
  "type": "object",
  "properties": {
    "eventName": {
      "type": "string",
      "sample": "clinical_record.calendar_view.view"
    },
    "eventData": {
      "type": "object",
      "properties": {
        "windowInstanceIds": {
          "type": "array",
          "length": 0,
          "items": "empty"
        },
        "page": {
          "type": "object",
          "properties": {
            "pathname": {
              "type": "string",
              "sample": "/patients"
            },
            "query": {
              "type": "string",
              "sample": ""
            }
          }
        },
        "isMaintenanceUser": {
          "type": "boolean",
          "sample": false
        },
        "patientUuid": {
          "type": "string",
          "sample": "2bfecb0b-d770-4932-beb4-49c16e63ae8c"
        },
        "activeFilterUuid": {
          "type": "string",
          "sample": ""
        },
        "activeFilterName": {
          "type": "string",
          "sample": ""
        },
        "activeFilterType": {
          "type": "string",
          "sample": "global"
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## SearchAccountingOrderTemplates

**Hash**: `f831c9fe37309a844b3fc107fbf5afdbfc933b81d30bf38cc4c951780447cd42`

### Variables

```json
{
  "input": {
    "query": "string",
    "searchDate": {
      "year": "number",
      "month": "number",
      "day": "number"
    },
    "pageSize": "number",
    "pageToken": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "searchAccountingOrderTemplates": {
          "type": "object",
          "properties": {
            "accountingOrderTemplates": {
              "type": "array",
              "items": "empty"
            },
            "nextPageToken": {
              "type": "string",
              "sample": ""
            },
            "__typename": {
              "type": "string",
              "sample": "SearchAccountingOrderTemplatesResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## SearchImagingOrderTemplates

**Hash**: `d97d1bb2418ee5f6150239809dd1dfb25251d6428711c7e3774afe1aeba70e4f`

### Variables

```json
{
  "input": {
    "query": "string",
    "searchDate": {
      "year": "number",
      "month": "number",
      "day": "number"
    },
    "pageSize": "number",
    "pageToken": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "searchImagingOrderTemplates": {
          "type": "object",
          "properties": {
            "imagingOrderTemplates": {
              "type": "array",
              "length": 300,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "67fd8a4e-620a-416b-afd6-4e777a76f86f"
                    },
                    "name": {
                      "type": "string",
                      "sample": "a1.   CT（検査入院時、入所時）"
                    },
                    "imagingModality": {
                      "type": "string",
                      "sample": "IMAGING_MODALITY_CT"
                    },
                    "note": {
                      "type": "string",
                      "sample": ""
                    },
                    "createTime": {
                      "type": "object",
                      "properties": {
                        "seconds": {
                          "type": "number",
                          "sample": 1747476095
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 284261000
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Timestamp"
                        }
                      }
                    },
                    "condition": {
                      "type": "object",
                      "properties": {
                        "plainRadiographyAnalog": {
                          "type": "null"
                        },
                        "plainRadiographyDigital": {
                          "type": "null"
                        },
                        "contrastAgentRadiographyAnalog": {
                          "type": "null"
                        },
                        "contrastAgentRadiographyDigital": {
                          "type": "null"
                        },
                        "ct": {
                          "type": "object",
                          "properties": {
                            "series": {
                              "type": "array",
                              "length": 1,
                              "items": [
                                {
                                  "type": "object",
                                  "properties": {
                                    "bodySiteUuid": {
                                      "type": "max_depth"
                                    },
                                    "uuid": {
                                      "type": "max_depth"
                                    },
                                    "filmCount": {
                                      "type": "max_depth"
                                    },
                                    "configuration": {
                                      "type": "max_depth"
                                    },
                                    "note": {
                                      "type": "max_depth"
                                    },
                                    "laterality": {
                                      "type": "max_depth"
                                    },
                                    "bodySite": {
                                      "type": "max_depth"
                                    },
                                    "medicines": {
                                      "type": "max_depth"
                                    },
                                    "isAccountingIgnored": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                }
                              ]
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "ImagingOrderDetail_CtCondition"
                            }
                          }
                        },
                        "md": {
                          "type": "null"
                        },
                        "mriOther": {
                          "type": "null"
                        },
                        "mriAbove_1_5AndBelow_3Tesla": {
                          "type": "null"
                        },
                        "dexa": {
                          "type": "null"
                        },
                        "fluoroscopy": {
                          "type": "null"
                        },
                        "dip": {
                          "type": "null"
                        },
                        "sexa": {
                          "type": "null"
                        },
                        "qus": {
                          "type": "null"
                        },
                        "mammographyAnalog": {
                          "type": "null"
                        },
                        "mammographyDigital": {
                          "type": "null"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "ImagingOrderDetail_Condition"
                        }
                      }
                    },
                    "startDate": {
                      "type": "null"
                    },
                    "endDate": {
                      "type": "null"
                    },
                    "encounterTemplateId": {
                      "type": "null"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "ImagingOrderTemplate"
                    }
                  }
                }
              ]
            },
            "nextPageToken": {
              "type": "string",
              "sample": "300"
            },
            "__typename": {
              "type": "string",
              "sample": "SearchImagingOrderTemplatesResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## SearchInjectionOrderTemplates

**Hash**: `74c97e62b1f022d10ebeada39e474ea01e57070f81465a290ba510cd649fd3c4`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "pageSize": {
          "type": "number",
          "sample": 100
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        },
        "searchDate": {
          "type": "object",
          "properties": {
            "year": {
              "type": "number",
              "sample": 2025
            },
            "month": {
              "type": "number",
              "sample": 12
            },
            "day": {
              "type": "number",
              "sample": 31
            }
          }
        },
        "query": {
          "type": "string",
          "sample": ""
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## SearchInjectionTechniques

**Hash**: `a5e39edca595d97330c4042c5e96bd1f7dd0e61e9f94a0d4d7575e5b4c56bd8c`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "sample": ""
        },
        "pageSize": {
          "type": "number",
          "sample": 100
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## SearchMedicinesV2

**Hash**: `8fe48cbcb9c7fe133b52087bb91401482e81993d4d898a5ab2609fc7c7e6f80e`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "pageSize": {
          "type": "number",
          "sample": 100
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        },
        "searchDate": {
          "type": "object",
          "properties": {
            "year": {
              "type": "number",
              "sample": 2025
            },
            "month": {
              "type": "number",
              "sample": 12
            },
            "day": {
              "type": "number",
              "sample": 31
            }
          }
        },
        "query": {
          "type": "string",
          "sample": ""
        },
        "patientCareType": {
          "type": "string",
          "sample": "PATIENT_CARE_TYPE_OUTPATIENT"
        },
        "filterDosageFormTypes": {
          "type": "array",
          "length": 1,
          "items": [
            {
              "type": "number",
              "sample": 4
            }
          ]
        },
        "excludeSenteiRyoyoKanjaKibo": {
          "type": "boolean",
          "sample": true
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## SearchMhlwEquipments

**Hash**: `6ac8580d2a612cfde038b5f85009c3ecd1153413328d4f9fddd4bf9bd24d8956`

### Variables

```json
{
  "type": "object",
  "properties": {
    "input": {
      "type": "object",
      "properties": {
        "pageSize": {
          "type": "number",
          "sample": 100
        },
        "pageToken": {
          "type": "string",
          "sample": ""
        },
        "searchDate": {
          "type": "object",
          "properties": {
            "year": {
              "type": "number",
              "sample": 2025
            },
            "month": {
              "type": "number",
              "sample": 12
            },
            "day": {
              "type": "number",
              "sample": 31
            }
          }
        },
        "query": {
          "type": "string",
          "sample": ""
        }
      }
    }
  }
}
```

### Response Schema

```json

```

---

## SearchPrescriptionOrderTemplates

**Hash**: `3e6bbedb54b4a4d799421a145fcf06a5e78a54ed73e1b56f1d79c5362a26b726`

### Variables

```json
{
  "input": {
    "query": "string",
    "searchDate": {
      "year": "number",
      "month": "number",
      "day": "number"
    },
    "pageSize": "number",
    "pageToken": "string"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "searchPrescriptionOrderTemplates": {
          "type": "object",
          "properties": {
            "prescriptionOrderTemplates": {
              "type": "array",
              "length": 5,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "b71ca885-2e18-44a5-9c99-6f515536d364"
                    },
                    "name": {
                      "type": "string",
                      "sample": "こりせっと２（ロキソ２回）"
                    },
                    "medicationCategory": {
                      "type": "string",
                      "sample": "MEDICATION_CATEGORY_ORDINARY"
                    },
                    "note": {
                      "type": "string",
                      "sample": ""
                    },
                    "startDate": {
                      "type": "object",
                      "properties": {
                        "year": {
                          "type": "number",
                          "sample": 2025
                        },
                        "month": {
                          "type": "number",
                          "sample": 4
                        },
                        "day": {
                          "type": "number",
                          "sample": 16
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Date"
                        }
                      }
                    },
                    "endDate": {
                      "type": "null"
                    },
                    "createTime": {
                      "type": "object",
                      "properties": {
                        "seconds": {
                          "type": "number",
                          "sample": 1744794814
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 480337000
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Timestamp"
                        }
                      }
                    },
                    "rps": {
                      "type": "array",
                      "length": 2,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "medicationTiming": {
                              "type": "object",
                              "properties": {
                                "medicationTiming": {
                                  "type": "object",
                                  "properties": {
                                    "canonicalPrescriptionUsage": {
                                      "type": "max_depth"
                                    },
                                    "canonicalPrescriptionUsageUuid": {
                                      "type": "max_depth"
                                    },
                                    "timesOfDay": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "MedicationTiming"
                                }
                              }
                            },
                            "slidingScaleEnabled": {
                              "type": "boolean",
                              "sample": false
                            },
                            "dosageText": {
                              "type": "string",
                              "sample": ""
                            },
                            "asNeeded": {
                              "type": "boolean",
                              "sample": false
                            },
                            "boundsDurationDays": {
                              "type": "object",
                              "properties": {
                                "value": {
                                  "type": "number",
                                  "sample": 7
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "UInt32Value"
                                }
                              }
                            },
                            "dosageFormType": {
                              "type": "number",
                              "sample": 1
                            },
                            "expectedRepeatCount": {
                              "type": "null"
                            },
                            "instructions": {
                              "type": "array",
                              "length": 3,
                              "items": [
                                {
                                  "type": "object",
                                  "properties": {
                                    "instruction": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                }
                              ]
                            },
                            "isBringing": {
                              "type": "boolean",
                              "sample": false
                            },
                            "isWardStock": {
                              "type": "boolean",
                              "sample": false
                            },
                            "localInjectionTechnique": {
                              "type": "null"
                            },
                            "localInjectionTechniqueUuid": {
                              "type": "null"
                            },
                            "uuid": {
                              "type": "string",
                              "sample": "bdd54117-5a19-4ac8-9b16-471b8143b109"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "PrescriptionOrderRp"
                            }
                          }
                        }
                      ]
                    },
                    "encounterTemplateId": {
                      "type": "null"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "PrescriptionOrderTemplate"
                    }
                  }
                }
              ]
            },
            "nextPageToken": {
              "type": "string",
              "sample": ""
            },
            "__typename": {
              "type": "string",
              "sample": "SearchPrescriptionOrderTemplatesResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## UpdateClinicalDocument

**Hash**: `d98d5ed7b15b4f5769af595e5b4a2b29f2eb11a4d6f639856e237c2a281cc6af`

### Variables

```json
{
  "input": {
    "clinicalDocument": {
      "uuid": "string",
      "patientUuid": "string",
      "editorData": "string",
      "type": {
        "type": "string",
        "clinicalDocumentCustomTypeUuid": "null"
      },
      "performTime": {
        "seconds": "number",
        "nanos": "number"
      },
      "hospitalizationUuid": {
        "value": "string"
      }
    },
    "updateMask": {
      "paths": [
        "string"
      ]
    }
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "updateClinicalDocument": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "416b95c4-0252-41c9-9ac4-3d456551bca6"
            },
            "hospitalizationUuid": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "7fed3631-0d9b-4f1e-a4e5-60cde1d21cfe"
                },
                "__typename": {
                  "type": "string",
                  "sample": "StringValue"
                }
              }
            },
            "patientUuid": {
              "type": "string",
              "sample": "5cb2ec51-3d68-4788-8775-eafff2a5429f"
            },
            "creatorUuid": {
              "type": "string",
              "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
            },
            "lastAuthorUuid": {
              "type": "string",
              "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
            },
            "editorData": {
              "type": "string",
              "sample": "{\n  \"blocks\": [\n    {\n      \"key\": \"e82n9\",\n      ..."
            },
            "type": {
              "type": "object",
              "properties": {
                "clinicalDocumentCustomTypeUuid": {
                  "type": "null"
                },
                "type": {
                  "type": "string",
                  "sample": "HOSPITALIZATION_CONSULTATION"
                },
                "excerptType": {
                  "type": "string",
                  "sample": "TRUNCATED"
                },
                "clinicalDocumentCustomType": {
                  "type": "null"
                },
                "__typename": {
                  "type": "string",
                  "sample": "ClinicalDocumentType"
                }
              }
            },
            "performTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767401460
                },
                "nanos": {
                  "type": "number",
                  "sample": 0
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "createTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767401580
                },
                "nanos": {
                  "type": "number",
                  "sample": 132264000
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "updateTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767401747
                },
                "nanos": {
                  "type": "number",
                  "sample": 82383000
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "patient": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "5cb2ec51-3d68-4788-8775-eafff2a5429f"
                },
                "serialNumber": {
                  "type": "string",
                  "sample": "19883"
                },
                "serialNumberPrefix": {
                  "type": "string",
                  "sample": ""
                },
                "fullName": {
                  "type": "string",
                  "sample": "北村 浩久"
                },
                "fullNamePhonetic": {
                  "type": "string",
                  "sample": "キタムラ ヒロヒサ"
                },
                "isDraft": {
                  "type": "boolean",
                  "sample": false
                },
                "isTestPatient": {
                  "type": "boolean",
                  "sample": false
                },
                "detail": {
                  "type": "object",
                  "properties": {
                    "patientUuid": {
                      "type": "string",
                      "sample": "5cb2ec51-3d68-4788-8775-eafff2a5429f"
                    },
                    "addressLine_1": {
                      "type": "string",
                      "sample": "香川県高松市木太町1734－7"
                    },
                    "addressLine_2": {
                      "type": "string",
                      "sample": ""
                    },
                    "postalCode": {
                      "type": "string",
                      "sample": "7600080"
                    },
                    "email": {
                      "type": "string",
                      "sample": ""
                    },
                    "phoneNumber": {
                      "type": "string",
                      "sample": "09013246216"
                    },
                    "sexType": {
                      "type": "string",
                      "sample": "SEX_TYPE_MALE"
                    },
                    "birthDate": {
                      "type": "object",
                      "properties": {
                        "year": {
                          "type": "number",
                          "sample": 1960
                        },
                        "month": {
                          "type": "number",
                          "sample": 3
                        },
                        "day": {
                          "type": "number",
                          "sample": 7
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Date"
                        }
                      }
                    },
                    "memo": {
                      "type": "string",
                      "sample": "急変時県立中央病院に搬送してほしい。高額療養0707 0708 0709   一包化 壱番町ドーム薬..."
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "PatientDetail"
                    }
                  }
                },
                "tags": {
                  "type": "array",
                  "length": 8,
                  "items": [
                    {
                      "type": "string",
                      "sample": "重度褥瘡処置は2026/1/18まで"
                    }
                  ]
                },
                "attentionSummary": {
                  "type": "object",
                  "properties": {
                    "hasAnyInfection": {
                      "type": "boolean",
                      "sample": false
                    },
                    "hasAnyAllergy": {
                      "type": "boolean",
                      "sample": false
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "PatientAttentionSummary"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "Patient"
                }
              }
            },
            "lastAuthor": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                },
                "name": {
                  "type": "string",
                  "sample": "亀山　真一郎"
                },
                "namePhonetic": {
                  "type": "object",
                  "properties": {
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    },
                    "value": {
                      "type": "string",
                      "sample": "カメヤマ　シンイチロウ"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "creator": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                },
                "name": {
                  "type": "string",
                  "sample": "亀山　真一郎"
                },
                "namePhonetic": {
                  "type": "object",
                  "properties": {
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    },
                    "value": {
                      "type": "string",
                      "sample": "カメヤマ　シンイチロウ"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "__typename": {
              "type": "string",
              "sample": "ClinicalDocument"
            }
          }
        }
      }
    }
  }
}
```

---

## UpdateOrderNotifiableViewAction

**Hash**: `ac2a67b3ea9bcab4340446c7f97c7e961d0a6fed82d603455e19697b8f600702`

### Variables

```json
{
  "input": {
    "isNotificationVisible": "boolean",
    "isScheduledVisible": "boolean"
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "updateOrderNotifiableViewAction": {
          "type": "boolean",
          "sample": true
        }
      }
    }
  }
}
```

---

## UpdatePatientFile

**Hash**: `d3907a78f106a5430c349561ddc02303d9e557853d57ca3a33a560ddc98ea04a`

### Variables

```json
{
  "input": {
    "uuid": "string",
    "title": "string",
    "description": "string",
    "parentFileFolderUuid": {
      "value": "string"
    },
    "updateMask": {
      "paths": [
        "string"
      ]
    }
  }
}
```

### Response Schema

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "updatePatientFile": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "be6dae0f-164f-475e-b64c-f9f5bba3e192"
            },
            "createTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767250394
                },
                "nanos": {
                  "type": "number",
                  "sample": 319946000
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "file": {
              "type": "object",
              "properties": {
                "mimeType": {
                  "type": "string",
                  "sample": "application/vnd.openxmlformats-officedocument.word..."
                },
                "fileType": {
                  "type": "string",
                  "sample": "FILE_TYPE_DOCX"
                },
                "redirectUrl": {
                  "type": "string",
                  "sample": "https://storage.googleapis.com/henry-files-product..."
                },
                "fileSize": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "type": "number",
                      "sample": 9285
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "UInt32Value"
                    }
                  }
                },
                "previewImageUrl": {
                  "type": "null"
                },
                "imageWidth": {
                  "type": "null"
                },
                "imageHeight": {
                  "type": "null"
                },
                "title": {
                  "type": "string",
                  "sample": "受診報告.docx"
                },
                "description": {
                  "type": "string",
                  "sample": ""
                },
                "__typename": {
                  "type": "string",
                  "sample": "AttachmentFile"
                }
              }
            },
            "__typename": {
              "type": "string",
              "sample": "PatientFile"
            }
          }
        }
      }
    }
  }
}
```

---
