# Henry API Reference

> 生成日時: 2026/1/12 19:52:51
> 収集済み API: 155 件

## 目次 (Table of Contents)

- [AccountingSetFolders](#accountingsetfolders)
- [AccountingSets](#accountingsets)
- [AuthenticateToken](#authenticatetoken)
- [AutocompletePatients](#autocompletepatients)
- [ChannelTalkMemberHash](#channeltalkmemberhash)
- [ChargeItemDefinitions](#chargeitemdefinitions)
- [ClinicalCalendarView](#clinicalcalendarview)
- [CopyToEncounter](#copytoencounter)
- [CreateAccountingOrderOrderStatusAction](#createaccountingorderorderstatusaction)
- [CreateClinicalDocument](#createclinicaldocument)
- [CreateImagingOrder](#createimagingorder)
- [CreateImagingOrderOrderStatusAction](#createimagingorderorderstatusaction)
- [CreateImagingOrderTemplate](#createimagingordertemplate)
- [CreatePatientDocumentTemplate](#createpatientdocumenttemplate)
- [CreatePatientFileFromPatientDocumentTemplate](#createpatientfilefrompatientdocumenttemplate)
- [CreatePrescriptionOrder](#createprescriptionorder)
- [CreatePrescriptionOrderTemplate](#createprescriptionordertemplate)
- [CreateRehabilitationOrder](#createrehabilitationorder)
- [CreateSession](#createsession)
- [CreateSessionStateAction](#createsessionstateaction)
- [DeleteEncounterTemplate](#deleteencountertemplate)
- [DeleteEncounterTemplateFolder](#deleteencountertemplatefolder)
- [DeleteEncounterTemplateRecord](#deleteencountertemplaterecord)
- [DeleteImagingOrderTemplate](#deleteimagingordertemplate)
- [DeletePatientDocumentTemplate](#deletepatientdocumenttemplate)
- [DeletePatientFile](#deletepatientfile)
- [DeleteSession](#deletesession)
- [DiscardDraftEncounterRecord](#discarddraftencounterrecord)
- [DiscardDraftEncounterTemplateRecords](#discarddraftencountertemplaterecords)
- [EncounterEditorQuery](#encountereditorquery)
- [EncountersByIds](#encountersbyids)
- [EncountersInPatient](#encountersinpatient)
- [EncounterTemplateFoldersQuery](#encountertemplatefoldersquery)
- [EncounterTemplateQuery](#encountertemplatequery)
- [EncounterTemplatesQuery](#encountertemplatesquery)
- [EncounterViewerQuery](#encounterviewerquery)
- [ExpandEncounterTemplate](#expandencountertemplate)
- [ExpandEncounterTemplateToTemplate](#expandencountertemplatetotemplate)
- [GetAccountingOrder](#getaccountingorder)
- [GetAccountingOrderTemplate](#getaccountingordertemplate)
- [GetClinicalCalendarView](#getclinicalcalendarview)
- [GetClinicalDocument](#getclinicaldocument)
- [GetFileUploadUrl](#getfileuploadurl)
- [GetImagingOrder](#getimagingorder)
- [GetImagingOrderTemplate](#getimagingordertemplate)
- [GetInjectionOrderTemplate](#getinjectionordertemplate)
- [GetIntractableDiseaseType](#getintractablediseasetype)
- [GetNutritionOrder](#getnutritionorder)
- [GetOrderNotifiableViewAction](#getordernotifiableviewaction)
- [GetOrganization](#getorganization)
- [getOrganizationFeatureFlag](#getorganizationfeatureflag)
- [GetOutpatientAccountingBilling](#getoutpatientaccountingbilling)
- [GetPatient](#getpatient)
- [GetPatientDocumentTemplate](#getpatientdocumenttemplate)
- [GetPatientPrescriptionIssueSelect](#getpatientprescriptionissueselect)
- [GetPrescriptionOrder](#getprescriptionorder)
- [GetPrescriptionOrderTemplate](#getprescriptionordertemplate)
- [GetRehabilitationOrder](#getrehabilitationorder)
- [GetSession](#getsession)
- [GetSpecimenInspectionOrder](#getspecimeninspectionorder)
- [ListActiveNursingPlans](#listactivenursingplans)
- [ListAllPatientAttentions](#listallpatientattentions)
- [ListAllPatientAttentionsV2](#listallpatientattentionsv2)
- [ListAllRehabilitationCalculationTypes](#listallrehabilitationcalculationtypes)
- [ListAvailablePatientInsuranceCombinations](#listavailablepatientinsurancecombinations)
- [ListBiopsyInspections](#listbiopsyinspections)
- [ListClinicalDocumentCustomTypes](#listclinicaldocumentcustomtypes)
- [ListClinicalDocuments](#listclinicaldocuments)
- [ListClinicalDocumentTemplates](#listclinicaldocumenttemplates)
- [ListClinicalQuantitativeDataDefs](#listclinicalquantitativedatadefs)
- [ListDailyWardHospitalizations](#listdailywardhospitalizations)
- [ListDepartments](#listdepartments)
- [ListDiagnoses](#listdiagnoses)
- [ListFeatureFlags](#listfeatureflags)
- [ListHospitalizationDepartments](#listhospitalizationdepartments)
- [ListHospitalizationDoctors](#listhospitalizationdoctors)
- [ListHospitalizationLocations](#listhospitalizationlocations)
- [ListImagingOrderHistories](#listimagingorderhistories)
- [ListLastApprovedPrescriptionOrderHistories](#listlastapprovedprescriptionorderhistories)
- [ListLatestFinalizedImagingOrderHistories](#listlatestfinalizedimagingorderhistories)
- [ListLatestFinalizedSpecimenInspectionOrderHistories](#listlatestfinalizedspecimeninspectionorderhistories)
- [ListLaunchIntegrations](#listlaunchintegrations)
- [ListLocalBodySites](#listlocalbodysites)
- [ListMonthlyReceiptStates](#listmonthlyreceiptstates)
- [ListNonEmptyPatientFileFoldersOfPatient](#listnonemptypatientfilefoldersofpatient)
- [ListNotifiableOrders](#listnotifiableorders)
- [ListNursingJournalEditorTemplates](#listnursingjournaleditortemplates)
- [ListOrders](#listorders)
- [ListOrganizationClinicalRecordViewFilters](#listorganizationclinicalrecordviewfilters)
- [ListOrganizationImagingModalities](#listorganizationimagingmodalities)
- [ListOrganizationInstitutionStandards](#listorganizationinstitutionstandards)
- [ListOrganizationMemberships](#listorganizationmemberships)
- [ListPatientContacts](#listpatientcontacts)
- [ListPatientDocumentTemplates](#listpatientdocumenttemplates)
- [ListPatientFileFolders](#listpatientfilefolders)
- [ListPatientFiles](#listpatientfiles)
- [ListPatientHospitalizations](#listpatienthospitalizations)
- [ListPatientQualifications](#listpatientqualifications)
- [ListPatientReceiptDiseaseHistories](#listpatientreceiptdiseasehistories)
- [ListPatientReceiptDiseases](#listpatientreceiptdiseases)
- [ListPatientSessions](#listpatientsessions)
- [ListPatientSessionsForConfirmSimilarSessions](#listpatientsessionsforconfirmsimilarsessions)
- [ListPatientSummaries](#listpatientsummaries)
- [ListPatientsV2](#listpatientsv2)
- [ListPurposeOfVisits](#listpurposeofvisits)
- [ListRehabilitationDocuments](#listrehabilitationdocuments)
- [ListRehabilitationDocumentTemplates](#listrehabilitationdocumenttemplates)
- [ListRehabilitationPlans](#listrehabilitationplans)
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
- [ListSurgeryDocumentTemplates](#listsurgerydocumenttemplates)
- [ListUnscheduledRoomsHospitalizations](#listunscheduledroomshospitalizations)
- [ListUserClinicalRecordViewFilters](#listuserclinicalrecordviewfilters)
- [ListUsers](#listusers)
- [ListWardOccupancy](#listwardoccupancy)
- [ListWards](#listwards)
- [NursingPlanTemplates](#nursingplantemplates)
- [PublishDraftEncounterRecords](#publishdraftencounterrecords)
- [PublishDraftEncounterTemplateRecords](#publishdraftencountertemplaterecords)
- [RecordAnalyticalEvent](#recordanalyticalevent)
- [SaveEncounterTemplate](#saveencountertemplate)
- [SaveEncounterTemplateFolder](#saveencountertemplatefolder)
- [SavePatientReceiptDiseaseTemplate](#savepatientreceiptdiseasetemplate)
- [SaveProgressNote](#saveprogressnote)
- [SaveProgressNoteTemplate](#saveprogressnotetemplate)
- [SearchAccountingOrderTemplates](#searchaccountingordertemplates)
- [SearchCanonicalPrescriptionUsages](#searchcanonicalprescriptionusages)
- [SearchDiagnoses](#searchdiagnoses)
- [SearchDiseases](#searchdiseases)
- [SearchImagingOrderTemplates](#searchimagingordertemplates)
- [SearchInjectionOrderTemplates](#searchinjectionordertemplates)
- [SearchMedicinesV2](#searchmedicinesv2)
- [SearchMhlwEquipments](#searchmhlwequipments)
- [SearchModifiers](#searchmodifiers)
- [SearchPatients](#searchpatients)
- [SearchPrescriptionOrderTemplates](#searchprescriptionordertemplates)
- [SearchSpecimenInspectionOrderTemplates](#searchspecimeninspectionordertemplates)
- [UpdateAccountingOrder](#updateaccountingorder)
- [UpdateAccountingOrderTemplate](#updateaccountingordertemplate)
- [UpdateImagingOrderTemplate](#updateimagingordertemplate)
- [UpdateInjectionOrderTemplate](#updateinjectionordertemplate)
- [UpdateMultiPatientReceiptDiseases](#updatemultipatientreceiptdiseases)
- [UpdateOrderNotifiableViewAction](#updateordernotifiableviewaction)
- [UpdatePrescriptionOrder](#updateprescriptionorder)
- [UpdatePrescriptionOrderTemplate](#updateprescriptionordertemplate)
- [UpdateSession](#updatesession)

---

## AccountingSetFolders

**Hash**: `25c2074604c22db2de611f6a5ec9e3d2aa1895bd9691a0056edfacda1db28d97`
**Endpoint**: `/graphql-v2`

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
**Endpoint**: `/graphql-v2`

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
**Endpoint**: `/graphql`

### Variables

```json
{
  "organizationUuid": "string",
  "token": "string",
  "isLogin": "boolean"
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
        "authenticateToken": {
          "type": "object",
          "properties": {
            "organizationUuid": {
              "type": "string",
              "sample": "ce6b556b-2a8d-4fce-b8dd-89ba638fc825"
            },
            "userUuid": {
              "type": "string",
              "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
            },
            "role": {
              "type": "string",
              "sample": "DOCTOR"
            },
            "departmentName": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "整形外科"
                },
                "__typename": {
                  "type": "string",
                  "sample": "StringValue"
                }
              }
            },
            "narcoticsLicenseNumber": {
              "type": "null"
            },
            "isPsychiatrist": {
              "type": "boolean",
              "sample": false
            },
            "hasPrescriptionAudit": {
              "type": "boolean",
              "sample": false
            },
            "organization": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "ce6b556b-2a8d-4fce-b8dd-89ba638fc825"
                },
                "name": {
                  "type": "string",
                  "sample": "医療法人社団弘徳会 マオカ病院"
                },
                "displayName": {
                  "type": "string",
                  "sample": "医社）弘徳会マオカ病院"
                },
                "institutionCode": {
                  "type": "string",
                  "sample": "0118153"
                },
                "sskRegisteredName": {
                  "type": "string",
                  "sample": "医社）弘徳会マオカ病院"
                },
                "founderName": {
                  "type": "string",
                  "sample": "宇都宮　栄"
                },
                "detail": {
                  "type": "object",
                  "properties": {
                    "organizationUuid": {
                      "type": "string",
                      "sample": "ce6b556b-2a8d-4fce-b8dd-89ba638fc825"
                    },
                    "addressLine": {
                      "type": "string",
                      "sample": "香川県高松市瓦町一丁目１２番地４５"
                    },
                    "prefectureCode": {
                      "type": "string",
                      "sample": "37"
                    },
                    "bedCount": {
                      "type": "number",
                      "sample": 58
                    },
                    "defaultPrescriptionSystem": {
                      "type": "string",
                      "sample": "PRESCRIPTION_SYSTEM_OUT_SOURCED"
                    },
                    "phoneNumber": {
                      "type": "string",
                      "sample": "087-862-8888"
                    },
                    "qualifiedInvoiceIssuerNumber": {
                      "type": "string",
                      "sample": ""
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "OrganizationDetail"
                    }
                  }
                },
                "__typename": {
                  "type": "string",
                  "sample": "Organization"
                }
              }
            },
            "user": {
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
            "order": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "number",
                  "sample": 119
                },
                "__typename": {
                  "type": "string",
                  "sample": "Int32Value"
                }
              }
            },
            "__typename": {
              "type": "string",
              "sample": "OrganizationMembership"
            }
          }
        }
      }
    }
  }
}
```

---

## AutocompletePatients

**Hash**: `06a31e0265627549e73ecf1600b53d0de0e034e19300acf218b94b37e1e9c268`
**Endpoint**: `/graphql`

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
        "autocompletePatients": {
          "type": "object",
          "properties": {
            "patients": {
              "type": "array",
              "length": 100,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "30405ac6-a49d-4cf8-b2ac-ecf0b465e3fb"
                    },
                    "serialNumber": {
                      "type": "string",
                      "sample": "20218"
                    },
                    "fullName": {
                      "type": "string",
                      "sample": "豊田 幸広"
                    },
                    "fullNamePhonetic": {
                      "type": "string",
                      "sample": "トヨタ ユキヒロ"
                    },
                    "detail": {
                      "type": "object",
                      "properties": {
                        "patientUuid": {
                          "type": "string",
                          "sample": "30405ac6-a49d-4cf8-b2ac-ecf0b465e3fb"
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
                              "sample": 1980
                            },
                            "month": {
                              "type": "number",
                              "sample": 7
                            },
                            "day": {
                              "type": "number",
                              "sample": 26
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "Date"
                            }
                          }
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "PatientDetail"
                        }
                      }
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "Patient"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "AutocompletePatientsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ChannelTalkMemberHash

**Hash**: `d23a491eebbad0719d34b46feaf96de956b02ed3807724ba1bb90d85e6be9946`
**Endpoint**: `/graphql`

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
        "channelTalkMemberHash": {
          "type": "string",
          "sample": "740c636f82606ae9c75b4b57dd70bbda273e6c191eac81be7c..."
        }
      }
    }
  }
}
```

---

## ChargeItemDefinitions

**Hash**: `e92aaa0c26e576bffc97e58967463408f06a15052430a0a29d80d6354ee52af3`
**Endpoint**: `/graphql-v2`

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
**Endpoint**: `/graphql-v2`

### Variables

```json
{
  "patientId": "string",
  "baseDate": "string",
  "beforeDateSize": "number",
  "afterDateSize": "number",
  "clinicalResourceHrns": [
    "string"
  ],
  "createUserIds": [
    "string"
  ],
  "accountingOrderShinryoShikibetsus": "[]",
  "includeRevoked": "boolean"
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
        "clinicalCalendarView": {
          "type": "object",
          "properties": {
            "injectionOrders": {
              "type": "array",
              "items": "empty"
            },
            "__typename": {
              "type": "string",
              "sample": "ClinicalCalendarView"
            }
          }
        }
      }
    }
  }
}
```

---

## CopyToEncounter

**Hash**: `6b1dbdd520269557d35723fc7284a456cd277ed806876902edb5467a1792ef1e`
**Endpoint**: `/graphql-v2`

### Variables

```json
{
  "destinationEncounterId": "string",
  "source": {
    "encounterId": "string",
    "encounterRecordId": "string"
  },
  "extendedInsuranceCombinationHrn": "null"
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
        "copyToEncounter": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "sample": "e9504d33-4c9a-4175-a65f-1417b8f9a23d"
            },
            "patientId": {
              "type": "string",
              "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
            },
            "patient": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string",
                  "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
                },
                "fullName": {
                  "type": "string",
                  "sample": "大平 逸郎"
                },
                "serialNumber": {
                  "type": "string",
                  "sample": "16581"
                },
                "birthDate": {
                  "type": "string",
                  "sample": "1961-04-19"
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
                      "sample": "9408b544-d18b-49f5-ab96-89941d25548b"
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
                      "sample": "2026-01-10T04:58:24Z"
                    },
                    "patientId": {
                      "type": "string",
                      "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
                    },
                    "patient": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string",
                          "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
                        },
                        "fullName": {
                          "type": "string",
                          "sample": "大平 逸郎"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Patient"
                        }
                      }
                    },
                    "doctorId": {
                      "type": "string",
                      "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                    },
                    "doctor": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string",
                          "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                        },
                        "name": {
                          "type": "string",
                          "sample": "亀山　真一郎"
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
                      "sample": "BEFORE_CONSULTATION"
                    },
                    "visitTime": {
                      "type": "string",
                      "sample": "2026-01-10T04:58:45.600299Z"
                    },
                    "deleteTime": {
                      "type": "null"
                    },
                    "outpatientAccounting": {
                      "type": "null"
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
              "sample": "2026-01-10T04:58:43.624874Z"
            },
            "hasBeenPublished": {
              "type": "boolean",
              "sample": true
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
                      "sample": "dd8f5bff-29ab-4c39-8ee5-68264f6d66c9"
                    },
                    "isDraft": {
                      "type": "boolean",
                      "sample": true
                    },
                    "encounterId": {
                      "type": "string",
                      "sample": "e9504d33-4c9a-4175-a65f-1417b8f9a23d"
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
                      "sample": "2026-01-10T05:08:41.430492Z"
                    },
                    "updateUser": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string",
                          "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                        },
                        "name": {
                          "type": "string",
                          "sample": "亀山　真一郎"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "User"
                        }
                      }
                    },
                    "createTime": {
                      "type": "string",
                      "sample": "2026-01-10T04:58:43.687765Z"
                    },
                    "createUser": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string",
                          "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                        },
                        "name": {
                          "type": "string",
                          "sample": "亀山　真一郎"
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
                      "sample": "{\"blocks\":[{\"key\":\"m5ig\",\"type\":\"unstyled\",\"text\":..."
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

## CreateAccountingOrderOrderStatusAction

**Hash**: `f38a588046584296fa8a48caebcac2f6d95dc38a13b2ed7ed5e1bda254bf01a8`
**Endpoint**: `/graphql`

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
        "createAccountingOrderOrderStatusAction": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "d0d8cb08-7675-48d8-962c-76fedf07f1a5"
            },
            "patient": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "36e1b61d-a1a3-429b-9a89-a487aa4ff0c5"
                },
                "fullName": {
                  "type": "string",
                  "sample": "尾﨑 弘子"
                },
                "fullNamePhonetic": {
                  "type": "string",
                  "sample": "オザキ ヒロコ"
                },
                "serialNumber": {
                  "type": "string",
                  "sample": "10586"
                },
                "detail": {
                  "type": "object",
                  "properties": {
                    "patientUuid": {
                      "type": "string",
                      "sample": "36e1b61d-a1a3-429b-9a89-a487aa4ff0c5"
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
                          "sample": 1959
                        },
                        "month": {
                          "type": "number",
                          "sample": 12
                        },
                        "day": {
                          "type": "number",
                          "sample": 11
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Date"
                        }
                      }
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "PatientDetail"
                    }
                  }
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
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "performDate": {
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
                  "sample": 10
                },
                "__typename": {
                  "type": "string",
                  "sample": "Date"
                }
              }
            },
            "orderStatus": {
              "type": "string",
              "sample": "ORDER_STATUS_ACTIVE"
            },
            "revokeDescription": {
              "type": "string",
              "sample": ""
            },
            "accountingInstructionGroups": {
              "type": "array",
              "length": 2,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "f167a5f0-591f-4c46-aee4-0a0f2c53a961"
                    },
                    "note": {
                      "type": "string",
                      "sample": ""
                    },
                    "extendedShinryoShikibetsu": {
                      "type": "string",
                      "sample": "EXTENDED_SHINRYO_SHIKIBETSU_SHOCHI"
                    },
                    "instructions": {
                      "type": "array",
                      "length": 1,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "diagnosisInstruction": {
                              "type": "object",
                              "properties": {
                                "uuid": {
                                  "type": "string",
                                  "sample": "478efbb2-4a16-4874-a0bc-05255c1e5c5d"
                                },
                                "mhlwDiagnosis": {
                                  "type": "object",
                                  "properties": {
                                    "id": {
                                      "type": "max_depth"
                                    },
                                    "code": {
                                      "type": "max_depth"
                                    },
                                    "name": {
                                      "type": "max_depth"
                                    },
                                    "unitCode": {
                                      "type": "max_depth"
                                    },
                                    "pointType": {
                                      "type": "max_depth"
                                    },
                                    "point": {
                                      "type": "max_depth"
                                    },
                                    "isStepValueRequiredForCalculation": {
                                      "type": "max_depth"
                                    },
                                    "stepValue": {
                                      "type": "max_depth"
                                    },
                                    "isDiminishing": {
                                      "type": "max_depth"
                                    },
                                    "startDate": {
                                      "type": "max_depth"
                                    },
                                    "endDate": {
                                      "type": "max_depth"
                                    },
                                    "applicableShinryoShikibetsuCodes": {
                                      "type": "max_depth"
                                    },
                                    "isInpatientUsable": {
                                      "type": "max_depth"
                                    },
                                    "isOutpatientUsable": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "quantity": {
                                  "type": "null"
                                },
                                "isAccountingIgnored": {
                                  "type": "boolean",
                                  "sample": false
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "DiagnosisInstruction"
                                }
                              }
                            },
                            "medicationDosageInstruction": {
                              "type": "null"
                            },
                            "equipmentInstruction": {
                              "type": "null"
                            },
                            "receiptComment": {
                              "type": "null"
                            },
                            "medicationUsageComment": {
                              "type": "null"
                            },
                            "nonHealthcareSystemInstruction": {
                              "type": "null"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "AccountingInstructionGroup_AccountingInstruction"
                            }
                          }
                        }
                      ]
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "AccountingInstructionGroup"
                    }
                  }
                }
              ]
            },
            "createUser": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "5182b5da-9394-4935-86fa-6cb402826a57"
                },
                "name": {
                  "type": "string",
                  "sample": "片山　優子"
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
                  "sample": 1768024112
                },
                "nanos": {
                  "type": "number",
                  "sample": 46255000
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
                  "sample": 1768032106
                },
                "nanos": {
                  "type": "number",
                  "sample": 420248577
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "encounterId": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "6ff94282-ef3f-4377-b213-70790cb6bbff"
                },
                "__typename": {
                  "type": "string",
                  "sample": "StringValue"
                }
              }
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
              "sample": true
            },
            "__typename": {
              "type": "string",
              "sample": "AccountingOrder"
            }
          }
        }
      }
    }
  }
}
```

---

## CreateClinicalDocument

**Hash**: `f1058bae8bc58c0fec53500fee346768f415f9a009724c6342186987c5d48199`
**Endpoint**: `/graphql`

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
              "sample": "8dd69f0e-9b98-463a-88a8-239d09d0432a"
            },
            "hospitalizationUuid": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "39fbd60c-5773-48e6-8477-6e6b726300d9"
                },
                "__typename": {
                  "type": "string",
                  "sample": "StringValue"
                }
              }
            },
            "patientUuid": {
              "type": "string",
              "sample": "24327699-2246-4eb9-8a3e-8e77fe332a16"
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
              "sample": "{\n  \"blocks\": [\n    {\n      \"key\": \"3qhro\",\n      ..."
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
                  "sample": 1768005480
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
                  "sample": 1768005571
                },
                "nanos": {
                  "type": "number",
                  "sample": 76050000
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
                  "sample": 1768005571
                },
                "nanos": {
                  "type": "number",
                  "sample": 76050000
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
                  "sample": "24327699-2246-4eb9-8a3e-8e77fe332a16"
                },
                "serialNumber": {
                  "type": "string",
                  "sample": "07481"
                },
                "serialNumberPrefix": {
                  "type": "string",
                  "sample": ""
                },
                "fullName": {
                  "type": "string",
                  "sample": "柏原 浩三"
                },
                "fullNamePhonetic": {
                  "type": "string",
                  "sample": "カシハラ コウゾウ"
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
                      "sample": "24327699-2246-4eb9-8a3e-8e77fe332a16"
                    },
                    "addressLine_1": {
                      "type": "string",
                      "sample": "高松市木太町1854-8"
                    },
                    "addressLine_2": {
                      "type": "string",
                      "sample": ""
                    },
                    "postalCode": {
                      "type": "string",
                      "sample": "760-0080"
                    },
                    "email": {
                      "type": "string",
                      "sample": ""
                    },
                    "phoneNumber": {
                      "type": "string",
                      "sample": "087-833-4505"
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
                          "sample": 1936
                        },
                        "month": {
                          "type": "number",
                          "sample": 2
                        },
                        "day": {
                          "type": "number",
                          "sample": 14
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Date"
                        }
                      }
                    },
                    "memo": {
                      "type": "string",
                      "sample": "医療情報取得加算（初診）7年9月   次回来院したらリハ上原先生に連絡"
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
                      "sample": "護送"
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
**Endpoint**: `/graphql`

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
        "ct": {
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
              "sample": "12c4f57c-687e-489a-8013-e5905a4c34f2"
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
                  "sample": 9
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
                  "sample": 1767959915
                },
                "nanos": {
                  "type": "number",
                  "sample": 389423995
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
                  "sample": 1767959915
                },
                "nanos": {
                  "type": "number",
                  "sample": 389423995
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
                  "sample": "12c4f57c-687e-489a-8013-e5905a4c34f2"
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
                                  "sample": "a2d976ff-90f2-4efd-86cf-9e74764fff13"
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

## CreateImagingOrderOrderStatusAction

**Hash**: `fc791f1dad434353d9c478ca30fbf7cf7055cf54ec255e7e6ec115f1fa7eed0d`
**Endpoint**: `/graphql`

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
              "sample": "12c4f57c-687e-489a-8013-e5905a4c34f2"
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
              "sample": "ORDER_STATUS_REVOKED"
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
            "createTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1767959915
                },
                "nanos": {
                  "type": "number",
                  "sample": 389424000
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
                  "sample": 1767960514
                },
                "nanos": {
                  "type": "number",
                  "sample": 232474815
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
                  "sample": "12c4f57c-687e-489a-8013-e5905a4c34f2"
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
                                  "sample": "a2d976ff-90f2-4efd-86cf-9e74764fff13"
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
              "sample": "テスト"
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

## CreateImagingOrderTemplate

**Hash**: `7a3cac47946a47cf46b532e408e91946a0ebadeb816069c5d9c6cc22e0db27cb`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "uuid": "string",
    "name": "string",
    "note": "string",
    "startDate": "null",
    "endDate": "null",
    "imagingModality": "string",
    "encounterTemplateId": {
      "value": "string"
    },
    "condition": {
      "plainRadiographyDigital": {
        "series": [
          {
            "uuid": "max_depth",
            "bodySiteUuid": "max_depth",
            "bodyPositions": "max_depth",
            "filmCount": "max_depth",
            "configuration": "max_depth",
            "note": "max_depth",
            "laterality": "max_depth",
            "isAccountingIgnored": "max_depth"
          }
        ]
      }
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
        "createImagingOrderTemplate": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "8b725bc4-41ba-4243-89a8-3b3d5412fff0"
            },
            "name": {
              "type": "string",
              "sample": ""
            },
            "imagingModality": {
              "type": "string",
              "sample": "IMAGING_MODALITY_PLAIN_RADIOGRAPHY_DIGITAL"
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
                  "sample": 1768104666
                },
                "nanos": {
                  "type": "number",
                  "sample": 282675711
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
                              "sample": "8b86198b-bf0c-436e-b5f6-01c0f016dda0"
                            },
                            "bodyPositions": {
                              "type": "array",
                              "length": 1,
                              "items": [
                                {
                                  "type": "string",
                                  "sample": "BODY_POSITION_FRONT"
                                }
                              ]
                            },
                            "filmCount": {
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
                            "configuration": {
                              "type": "string",
                              "sample": ""
                            },
                            "note": {
                              "type": "string",
                              "sample": ""
                            },
                            "laterality": {
                              "type": "string",
                              "sample": "LATERALITY_NONE"
                            },
                            "bodySite": {
                              "type": "object",
                              "properties": {
                                "uuid": {
                                  "type": "string",
                                  "sample": "85c436f8-fdb5-40d5-9cc2-ca3c55562b94"
                                },
                                "name": {
                                  "type": "string",
                                  "sample": "胸部"
                                },
                                "lateralityRequirement": {
                                  "type": "boolean",
                                  "sample": true
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "LocalBodySite"
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
            "startDate": {
              "type": "null"
            },
            "endDate": {
              "type": "null"
            },
            "encounterTemplateId": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "6793537a-5180-4d42-b637-c21ea91724fc"
                },
                "__typename": {
                  "type": "string",
                  "sample": "StringValue"
                }
              }
            },
            "__typename": {
              "type": "string",
              "sample": "ImagingOrderTemplate"
            }
          }
        }
      }
    }
  }
}
```

---

## CreatePatientDocumentTemplate

**Hash**: `656085993386e8a21a874bd7eda966c1d39dc0f2cdb40125b920d24255e4d9ee`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "customPlaceholders": "[]",
    "description": "string",
    "fileUrl": "string",
    "title": "string",
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
        "createPatientDocumentTemplate": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "35a295bd-e3be-4d16-8ad5-2616b1b4d3ee"
            },
            "title": {
              "type": "string",
              "sample": "99テスト＞診断書"
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

## CreatePatientFileFromPatientDocumentTemplate

**Hash**: `83624d7ec7d72d0f3eb25f3c4d4551bca5d7effefc2f605797d7b6858b23bee1`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "patientDocumentTemplateUuid": "string",
    "sessionUuid": {
      "value": "string"
    },
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
              "sample": "b25a125d-bebe-41ca-a763-2da0dbe9820d"
            },
            "createTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1768024808
                },
                "nanos": {
                  "type": "number",
                  "sample": 696376000
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
                      "sample": 41611
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
                  "sample": "診断書"
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

## CreatePrescriptionOrder

**Hash**: `3f9f590df716819e97071a7bb1f2bc80e9d751be83bab7558d43fa11fb14b83e`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "uuid": "string",
    "patientUuid": "string",
    "doctorUuid": "string",
    "medicationCategory": "string",
    "startDate": {
      "year": "number",
      "month": "number",
      "day": "number"
    },
    "note": "string",
    "revokeDescription": "string",
    "rps": [
      {
        "uuid": "string",
        "asNeeded": "boolean",
        "boundsDurationDays": "null",
        "dosageFormType": "number",
        "expectedRepeatCount": "null",
        "instructions": [
          {
            "instruction": "max_depth"
          }
        ],
        "isBringing": "boolean",
        "isWardStock": "boolean",
        "dosageText": "string",
        "localInjectionTechniqueUuid": "null",
        "medicationTiming": {
          "medicationTiming": {
            "canonicalPrescriptionUsageUuid": "max_depth",
            "timesOfDay": "max_depth"
          }
        },
        "slidingScaleEnabled": "boolean"
      }
    ],
    "encounterId": {
      "value": "string"
    },
    "saveAsDraft": "boolean",
    "extendedInsuranceCombinationId": "null"
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
        "createPrescriptionOrder": {
          "type": "object",
          "properties": {
            "createTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1768024785
                },
                "nanos": {
                  "type": "number",
                  "sample": 646222277
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
              "sample": "MEDICATION_CATEGORY_OUT_OF_HOSPITAL"
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
              "sample": "ORDER_STATUS_ON_HOLD"
            },
            "patient": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "46f7d421-872d-4074-b323-61acd59d8d59"
                },
                "serialNumber": {
                  "type": "string",
                  "sample": "13940"
                },
                "serialNumberPrefix": {
                  "type": "string",
                  "sample": ""
                },
                "fullName": {
                  "type": "string",
                  "sample": "佐藤 かおり"
                },
                "fullNamePhonetic": {
                  "type": "string",
                  "sample": "サトウ カオリ"
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
                      "sample": "46f7d421-872d-4074-b323-61acd59d8d59"
                    },
                    "addressLine_1": {
                      "type": "string",
                      "sample": "香川県高松市今里町2丁目11-4"
                    },
                    "addressLine_2": {
                      "type": "string",
                      "sample": ""
                    },
                    "postalCode": {
                      "type": "string",
                      "sample": "760-0078"
                    },
                    "email": {
                      "type": "string",
                      "sample": ""
                    },
                    "phoneNumber": {
                      "type": "string",
                      "sample": "09031818270"
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
                          "sample": 1975
                        },
                        "month": {
                          "type": "number",
                          "sample": 12
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
                    "memo": {
                      "type": "string",
                      "sample": "医療情報取得加算(初)01年01月"
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
            "patientUuid": {
              "type": "string",
              "sample": "46f7d421-872d-4074-b323-61acd59d8d59"
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
                                  "sample": "fbd38e36-2c04-4665-8e96-d9bc8e1abe0d"
                                },
                                "text": {
                                  "type": "string",
                                  "sample": "１日１〜数回"
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
                                  "sample": "fbd38e36-2c04-4665-8e96-d9bc8e1abe0d"
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
                      "sample": "両膝　２ｗ"
                    },
                    "asNeeded": {
                      "type": "boolean",
                      "sample": false
                    },
                    "boundsDurationDays": {
                      "type": "null"
                    },
                    "dosageFormType": {
                      "type": "number",
                      "sample": 6
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
                      "sample": "3fd3f7cd-9825-4663-a2fc-4660458eae65"
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
                  "sample": 2026
                },
                "month": {
                  "type": "number",
                  "sample": 1
                },
                "day": {
                  "type": "number",
                  "sample": 10
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
                  "sample": 1768024785
                },
                "nanos": {
                  "type": "number",
                  "sample": 646222277
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
              "sample": "463e0ba7-486d-421b-9ad6-57852b835442"
            },
            "encounterId": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "919dd21c-75b5-41b1-b292-0f3b17ac9e20"
                },
                "__typename": {
                  "type": "string",
                  "sample": "StringValue"
                }
              }
            },
            "extendedInsuranceCombinationId": {
              "type": "null"
            },
            "isDraft": {
              "type": "boolean",
              "sample": true
            },
            "isOutpatient": {
              "type": "boolean",
              "sample": true
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

## CreatePrescriptionOrderTemplate

**Hash**: `be4780d76580962941cb3011ffe3c13c0610307a520eedc002437bd4b5b05f0e`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "uuid": "string",
    "name": "string",
    "medicationCategory": "string",
    "note": "string",
    "rps": [
      {
        "uuid": "string",
        "asNeeded": "boolean",
        "boundsDurationDays": "null",
        "dosageFormType": "number",
        "expectedRepeatCount": {
          "value": "number"
        },
        "instructions": [
          {
            "instruction": "max_depth"
          }
        ],
        "isBringing": "boolean",
        "isWardStock": "boolean",
        "dosageText": "string",
        "localInjectionTechniqueUuid": "null",
        "medicationTiming": {
          "medicationTiming": {
            "canonicalPrescriptionUsageUuid": "max_depth",
            "timesOfDay": "max_depth"
          }
        },
        "slidingScaleEnabled": "boolean"
      }
    ],
    "startDate": "null",
    "endDate": "null",
    "encounterTemplateId": {
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
        "createPrescriptionOrderTemplate": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "f254f25e-32e0-4a86-91e3-88d9467a4d1a"
            },
            "name": {
              "type": "string",
              "sample": ""
            },
            "medicationCategory": {
              "type": "string",
              "sample": "MEDICATION_CATEGORY_OUT_OF_HOSPITAL"
            },
            "note": {
              "type": "string",
              "sample": ""
            },
            "startDate": {
              "type": "null"
            },
            "endDate": {
              "type": "null"
            },
            "createTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1768128479
                },
                "nanos": {
                  "type": "number",
                  "sample": 781382163
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
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
                                  "sample": "7daa8633-e526-48d5-a488-10b24afdd5a6"
                                },
                                "text": {
                                  "type": "string",
                                  "sample": "疼痛時"
                                },
                                "useAsNeeded": {
                                  "type": "boolean",
                                  "sample": true
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
                                  "sample": "7daa8633-e526-48d5-a488-10b24afdd5a6"
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
                      "sample": true
                    },
                    "boundsDurationDays": {
                      "type": "null"
                    },
                    "dosageFormType": {
                      "type": "number",
                      "sample": 1
                    },
                    "expectedRepeatCount": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "number",
                          "sample": 10
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "UInt32Value"
                        }
                      }
                    },
                    "instructions": {
                      "type": "array",
                      "length": 2,
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
                      "sample": "a7c8a98c-0b21-4055-a62d-ed0381a68bf3"
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
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "02cb30e2-b764-4c89-9bb0-af4dc43d8b4e"
                },
                "__typename": {
                  "type": "string",
                  "sample": "StringValue"
                }
              }
            },
            "__typename": {
              "type": "string",
              "sample": "PrescriptionOrderTemplate"
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
**Endpoint**: `/graphql`

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
      "rehabilitationTherapyStartDateTypeUuid": "null",
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
              "sample": "c8019c43-b5fe-4221-86f4-a60f76e31e5c"
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
            "orderStatus": {
              "type": "string",
              "sample": "ORDER_STATUS_ON_HOLD"
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
                  "sample": 11
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
                  "sample": 6
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
                  "sample": 1768084103
                },
                "nanos": {
                  "type": "number",
                  "sample": 647711025
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
                  "sample": 1768084103
                },
                "nanos": {
                  "type": "number",
                  "sample": 647711025
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
                  "sample": "c8019c43-b5fe-4221-86f4-a60f76e31e5c"
                },
                "patientReceiptDiseaseUuid": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "type": "string",
                      "sample": "9e90fcb2-380f-4b04-9602-3b71d6c5e8ac"
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
                      "sample": 2026
                    },
                    "month": {
                      "type": "number",
                      "sample": 1
                    },
                    "day": {
                      "type": "number",
                      "sample": 11
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
                      "sample": "2008e5c7-b596-4477-8ed6-aedcacc87d2d"
                    }
                  ]
                },
                "rehabilitationCalculationTypeUuid": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "type": "string",
                      "sample": "c86098b6-af99-49f3-b229-b3119eef5372"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    }
                  }
                },
                "rehabilitationTherapyStartDateTypeUuid": {
                  "type": "null"
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
                      "sample": "9e90fcb2-380f-4b04-9602-3b71d6c5e8ac"
                    },
                    "patientUuid": {
                      "type": "string",
                      "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
                    },
                    "masterDiseaseCode": {
                      "type": "string",
                      "sample": "8831347"
                    },
                    "masterModifierCodes": {
                      "type": "array",
                      "items": "empty"
                    },
                    "isMain": {
                      "type": "boolean",
                      "sample": false
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
                          "sample": 12
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
                    "masterDisease": {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "sample": "8831347"
                        },
                        "name": {
                          "type": "string",
                          "sample": "肩こり"
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
                              "sample": "M6281"
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
                          "sample": "30cad7ab-a2c9-4450-90cb-c810e0991dcb"
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
                    "createTime": {
                      "type": "object",
                      "properties": {
                        "seconds": {
                          "type": "number",
                          "sample": 1765260110
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 983145000
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
                          "sample": 1765260110
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 983145000
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
                      "sample": "c86098b6-af99-49f3-b229-b3119eef5372"
                    },
                    "name": {
                      "type": "string",
                      "sample": "運動器リハビリテーション"
                    },
                    "period": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "number",
                          "sample": 150
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
                      "length": 4,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "8829c0f0-ac88-4df5-aa7e-910ac679ed24"
                            },
                            "name": {
                              "type": "string",
                              "sample": "発症日"
                            },
                            "rehabilitationCalculationTypeId": {
                              "type": "string",
                              "sample": "c86098b6-af99-49f3-b229-b3119eef5372"
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
                      "length": 3,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "ed20cf82-c092-4ddb-88af-2737a217242c"
                            },
                            "rehabilitationCalculationTypeId": {
                              "type": "string",
                              "sample": "c86098b6-af99-49f3-b229-b3119eef5372"
                            },
                            "name": {
                              "type": "string",
                              "sample": "発症日"
                            },
                            "needsAcuteDiseaseName": {
                              "type": "boolean",
                              "sample": false
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
                          "sample": "2008e5c7-b596-4477-8ed6-aedcacc87d2d"
                        },
                        "category": {
                          "type": "string",
                          "sample": "PT"
                        },
                        "name": {
                          "type": "string",
                          "sample": "評価"
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
**Endpoint**: `/graphql`

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
              "sample": "c4ee17cc-7ded-4dc1-a272-f33e0c615d2b"
            },
            "patientUuid": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
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
                  "sample": 1768083899
                },
                "nanos": {
                  "type": "number",
                  "sample": 608947000
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
                  "sample": 1768083893
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
                  "sample": "f956ac69-f9f5-4521-8d8b-b360e52ccfa8"
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

## CreateSessionStateAction

**Hash**: `6316ec4b3d00c5f69bc61c977880d1384317b3c8053135047eb31fce132220d5`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "sessionUuid": "string",
    "action": "string"
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
        "createSessionStateAction": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "c4ee17cc-7ded-4dc1-a272-f33e0c615d2b"
            },
            "patientUuid": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
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
                  "sample": 1768084155
                },
                "nanos": {
                  "type": "number",
                  "sample": 711620000
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
                  "sample": 1768083893
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
                  "sample": 1768084155
                },
                "nanos": {
                  "type": "number",
                  "sample": 711620000
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
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
                  "sample": "f956ac69-f9f5-4521-8d8b-b360e52ccfa8"
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

## DeleteEncounterTemplate

**Hash**: `16eed8b57ec161af47fa529395291601ec5f6c6f4505f0aa8f9d2413c332c607`
**Endpoint**: `/graphql-v2`

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
        "deleteEncounterTemplate": {
          "type": "boolean",
          "sample": true
        }
      }
    }
  }
}
```

---

## DeleteEncounterTemplateFolder

**Hash**: `858d454e005ac68c5e65b7f2e458ecb96df34184821c81daa22855af7bbe3162`
**Endpoint**: `/graphql-v2`

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
        "deleteEncounterTemplateFolder": {
          "type": "boolean",
          "sample": true
        }
      }
    }
  }
}
```

---

## DeleteEncounterTemplateRecord

**Hash**: `6f001685351c54d8f3b8e984d9ac83b0a9c0e06125f13afc7b1a8e24aad16faa`
**Endpoint**: `/graphql-v2`

### Variables

```json
{
  "id": "string",
  "recordHrn": "string"
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
        "deleteEncounterTemplateRecord": {
          "type": "boolean",
          "sample": true
        }
      }
    }
  }
}
```

---

## DeleteImagingOrderTemplate

**Hash**: `1c35d7b95e2fbfd9d2d5f321097c726376cae1a5343364cfb41988ef8ee136b8`
**Endpoint**: `/graphql`

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
        "deleteImagingOrderTemplate": {
          "type": "boolean",
          "sample": true
        }
      }
    }
  }
}
```

---

## DeletePatientDocumentTemplate

**Hash**: `3e0790dc0f3fdb503e53d7169a3a08ebb71e29f2ee42096d7bcae5da17e5ed81`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "customPlaceholders": "[]",
    "description": "string",
    "fileUrl": "string",
    "title": "string",
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
        "deletePatientDocumentTemplate": {
          "type": "boolean",
          "sample": true
        }
      }
    }
  }
}
```

---

## DeletePatientFile

**Hash**: `1fa5b6878de17cf5e81b9bb0c37e4b05645de5762b1c15166643e4c1e60eef21`
**Endpoint**: `/graphql`

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

## DeleteSession

**Hash**: `da28d7a414f875185d168c7ab3928a2ebab6bc189f576b5135fad4e9adca7f9b`
**Endpoint**: `/graphql`

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
        "deleteSession": {
          "type": "boolean",
          "sample": true
        }
      }
    }
  }
}
```

---

## DiscardDraftEncounterRecord

**Hash**: `c9235672cd512d91cae5654d5f9f1df1f9b553f61fe38549c06f45e6338cc432`
**Endpoint**: `/graphql-v2`

### Variables

```json
{
  "recordHrn": "string"
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
        "discardDraftEncounterRecord": {
          "type": "boolean",
          "sample": true
        }
      }
    }
  }
}
```

---

## DiscardDraftEncounterTemplateRecords

**Hash**: `b4de8f105d7865704bebe981d32eb4d20d6e0865d4fe840910c621d21b7c64b5`
**Endpoint**: `/graphql-v2`

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
        "discardDraftEncounterTemplateRecords": {
          "type": "boolean",
          "sample": false
        }
      }
    }
  }
}
```

---

## EncounterEditorQuery

**Hash**: `2002c819c9b49c8e9157bd967d6ff6bf8ba63dbe6ba466013c01079b2faa9b01`
**Endpoint**: `/graphql-v2`

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
        "encounter": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "sample": "e9504d33-4c9a-4175-a65f-1417b8f9a23d"
            },
            "patientId": {
              "type": "string",
              "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
            },
            "patient": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string",
                  "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
                },
                "fullName": {
                  "type": "string",
                  "sample": "大平 逸郎"
                },
                "serialNumber": {
                  "type": "string",
                  "sample": "16581"
                },
                "birthDate": {
                  "type": "string",
                  "sample": "1961-04-19"
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
                      "sample": "9408b544-d18b-49f5-ab96-89941d25548b"
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
                      "sample": "2026-01-10T04:58:24Z"
                    },
                    "patientId": {
                      "type": "string",
                      "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
                    },
                    "patient": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string",
                          "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
                        },
                        "fullName": {
                          "type": "string",
                          "sample": "大平 逸郎"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Patient"
                        }
                      }
                    },
                    "doctorId": {
                      "type": "string",
                      "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                    },
                    "doctor": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string",
                          "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                        },
                        "name": {
                          "type": "string",
                          "sample": "亀山　真一郎"
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
                      "sample": "BEFORE_CONSULTATION"
                    },
                    "visitTime": {
                      "type": "string",
                      "sample": "2026-01-10T04:58:45.600299Z"
                    },
                    "deleteTime": {
                      "type": "null"
                    },
                    "outpatientAccounting": {
                      "type": "null"
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
              "type": "null"
            },
            "hasBeenPublished": {
              "type": "boolean",
              "sample": false
            },
            "records": {
              "type": "array",
              "length": 1,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "id": {
                      "type": "string",
                      "sample": "dd8f5bff-29ab-4c39-8ee5-68264f6d66c9"
                    },
                    "isDraft": {
                      "type": "boolean",
                      "sample": true
                    },
                    "encounterId": {
                      "type": "string",
                      "sample": "e9504d33-4c9a-4175-a65f-1417b8f9a23d"
                    },
                    "isApproved": {
                      "type": "boolean",
                      "sample": false
                    },
                    "isDeleted": {
                      "type": "boolean",
                      "sample": false
                    },
                    "version": {
                      "type": "number",
                      "sample": 0
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
                      "sample": "2026-01-10T04:58:43.687765Z"
                    },
                    "updateUser": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string",
                          "sample": "c979e712-285c-48b0-992f-e06b603833a3"
                        },
                        "name": {
                          "type": "string",
                          "sample": "内田　くるみ"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "User"
                        }
                      }
                    },
                    "createTime": {
                      "type": "string",
                      "sample": "2026-01-10T04:58:43.687765Z"
                    },
                    "createUser": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string",
                          "sample": "c979e712-285c-48b0-992f-e06b603833a3"
                        },
                        "name": {
                          "type": "string",
                          "sample": "内田　くるみ"
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
                      "type": "null"
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

## EncountersByIds

**Hash**: `4eb34a1f909d3db6c045a82251f050d144fe8ffaf4a228c909ccdb24f2c35839`
**Endpoint**: `/graphql-v2`

### Variables

```json
{
  "ids": [
    "string"
  ]
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
        "encountersByIds": {
          "type": "array",
          "length": 1,
          "items": [
            {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string",
                  "sample": "e9504d33-4c9a-4175-a65f-1417b8f9a23d"
                },
                "patientId": {
                  "type": "string",
                  "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
                },
                "patient": {
                  "type": "object",
                  "properties": {
                    "id": {
                      "type": "string",
                      "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
                    },
                    "serialNumber": {
                      "type": "string",
                      "sample": "16581"
                    },
                    "fullName": {
                      "type": "string",
                      "sample": "大平 逸郎"
                    },
                    "fullNamePhonetic": {
                      "type": "string",
                      "sample": "オオヒラ イツロウ"
                    },
                    "sexType": {
                      "type": "string",
                      "sample": "MALE"
                    },
                    "birthDate": {
                      "type": "string",
                      "sample": "1961-04-19"
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
                          "sample": "9408b544-d18b-49f5-ab96-89941d25548b"
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
                          "sample": "2026-01-10T04:58:24Z"
                        },
                        "patientId": {
                          "type": "string",
                          "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
                        },
                        "patient": {
                          "type": "object",
                          "properties": {
                            "id": {
                              "type": "string",
                              "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
                            },
                            "fullName": {
                              "type": "string",
                              "sample": "大平 逸郎"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "Patient"
                            }
                          }
                        },
                        "doctorId": {
                          "type": "string",
                          "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                        },
                        "doctor": {
                          "type": "object",
                          "properties": {
                            "id": {
                              "type": "string",
                              "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                            },
                            "name": {
                              "type": "string",
                              "sample": "亀山　真一郎"
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
                          "sample": "BEFORE_CONSULTATION"
                        },
                        "visitTime": {
                          "type": "string",
                          "sample": "2026-01-10T04:58:45.600299Z"
                        },
                        "deleteTime": {
                          "type": "null"
                        },
                        "outpatientAccounting": {
                          "type": "null"
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
                  "sample": "2026-01-10T04:58:43.624874Z"
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
                          "sample": "dd8f5bff-29ab-4c39-8ee5-68264f6d66c9"
                        },
                        "encounterId": {
                          "type": "string",
                          "sample": "e9504d33-4c9a-4175-a65f-1417b8f9a23d"
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
                          "sample": "2026-01-10T05:14:40.096586Z"
                        },
                        "updateUser": {
                          "type": "object",
                          "properties": {
                            "id": {
                              "type": "string",
                              "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                            },
                            "name": {
                              "type": "string",
                              "sample": "亀山　真一郎"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "User"
                            }
                          }
                        },
                        "createTime": {
                          "type": "string",
                          "sample": "2026-01-10T04:58:43.687765Z"
                        },
                        "createUser": {
                          "type": "object",
                          "properties": {
                            "id": {
                              "type": "string",
                              "sample": "c979e712-285c-48b0-992f-e06b603833a3"
                            },
                            "name": {
                              "type": "string",
                              "sample": "内田　くるみ"
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
                          "sample": "{\"blocks\":[{\"key\":\"m5ig\",\"type\":\"unstyled\",\"text\":..."
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
          ]
        }
      }
    }
  }
}
```

---

## EncountersInPatient

**Hash**: `38dae08bd341c84b463953f74aaa6d8965317d967b1d1683aac012f70fbf8ae9`
**Endpoint**: `/graphql-v2`

### Variables

```json
{
  "patientId": "string",
  "startDate": "null",
  "endDate": "null",
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
        "encountersInPatient": {
          "type": "object",
          "properties": {
            "encounters": {
              "type": "array",
              "length": 5,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "id": {
                      "type": "string",
                      "sample": "2322367b-a657-43bd-a052-b2b68c609b20"
                    },
                    "patientId": {
                      "type": "string",
                      "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
                    },
                    "patient": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string",
                          "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
                        },
                        "serialNumber": {
                          "type": "string",
                          "sample": "00001"
                        },
                        "fullName": {
                          "type": "string",
                          "sample": "テスト 1"
                        },
                        "fullNamePhonetic": {
                          "type": "string",
                          "sample": "テスト イチ"
                        },
                        "sexType": {
                          "type": "string",
                          "sample": "MALE"
                        },
                        "birthDate": {
                          "type": "string",
                          "sample": "1975-09-18"
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
                              "sample": "acf069d0-c3fc-4973-b72a-a13c0ecaddc9"
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
                              "sample": "2025-12-22T02:30:37Z"
                            },
                            "patientId": {
                              "type": "string",
                              "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
                            },
                            "patient": {
                              "type": "object",
                              "properties": {
                                "id": {
                                  "type": "string",
                                  "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
                                },
                                "fullName": {
                                  "type": "string",
                                  "sample": "テスト 1"
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
                              "sample": "BEFORE_CONSULTATION"
                            },
                            "visitTime": {
                              "type": "null"
                            },
                            "deleteTime": {
                              "type": "null"
                            },
                            "outpatientAccounting": {
                              "type": "null"
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
                      "type": "null"
                    },
                    "records": {
                      "type": "array",
                      "items": "empty"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "Encounter"
                    }
                  }
                }
              ]
            },
            "nextPageToken": {
              "type": "string",
              "sample": "5"
            },
            "__typename": {
              "type": "string",
              "sample": "PagedEncounterList"
            }
          }
        }
      }
    }
  }
}
```

---

## EncounterTemplateFoldersQuery

**Hash**: `d8cdb1284fba81ef90e0dbe3f7f0992836223f28a0033ccd76366e0a1259ed03`
**Endpoint**: `/graphql-v2`

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

## EncounterTemplateQuery

**Hash**: `c2873e15f5a21e6b82b1164371bbe22fb5d936194592007720e402328701c303`
**Endpoint**: `/graphql-v2`

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
        "encounterTemplate": {
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
      }
    }
  }
}
```

---

## EncounterTemplatesQuery

**Hash**: `b45b92e7d5861186d126c6c353b6a55b2fc2baf57a0c704c7d008b1cd8659e8f`
**Endpoint**: `/graphql-v2`

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

## EncounterViewerQuery

**Hash**: `9915643dfabc5dd1a3ebc1ff845cd7bd9c43df4210f2b508d302997ab29c0970`
**Endpoint**: `/graphql-v2`

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
        "encounter": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "sample": "e9504d33-4c9a-4175-a65f-1417b8f9a23d"
            },
            "patientId": {
              "type": "string",
              "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
            },
            "patient": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string",
                  "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
                },
                "serialNumber": {
                  "type": "string",
                  "sample": "16581"
                },
                "fullName": {
                  "type": "string",
                  "sample": "大平 逸郎"
                },
                "fullNamePhonetic": {
                  "type": "string",
                  "sample": "オオヒラ イツロウ"
                },
                "sexType": {
                  "type": "string",
                  "sample": "MALE"
                },
                "birthDate": {
                  "type": "string",
                  "sample": "1961-04-19"
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
                      "sample": "9408b544-d18b-49f5-ab96-89941d25548b"
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
                      "sample": "2026-01-10T04:58:24Z"
                    },
                    "patientId": {
                      "type": "string",
                      "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
                    },
                    "patient": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string",
                          "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
                        },
                        "fullName": {
                          "type": "string",
                          "sample": "大平 逸郎"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Patient"
                        }
                      }
                    },
                    "doctorId": {
                      "type": "string",
                      "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                    },
                    "doctor": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string",
                          "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                        },
                        "name": {
                          "type": "string",
                          "sample": "亀山　真一郎"
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
                      "sample": "BEFORE_CONSULTATION"
                    },
                    "visitTime": {
                      "type": "string",
                      "sample": "2026-01-10T04:58:45.600299Z"
                    },
                    "deleteTime": {
                      "type": "null"
                    },
                    "outpatientAccounting": {
                      "type": "null"
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
              "type": "null"
            },
            "records": {
              "type": "array",
              "items": "empty"
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

## ExpandEncounterTemplate

**Hash**: `9399993dc569309020791a2c70c5171f9e87cc7e5ec0d433f4130c5a3de02685`
**Endpoint**: `/graphql-v2`

### Variables

```json
{
  "encounterId": "string",
  "encounterTemplateId": "string",
  "extendedInsuranceCombinationHrn": "null",
  "progressNoteTemplateInsertPositionInput": {
    "progressNoteId": "string",
    "blockIndex": "number"
  },
  "asNewOrder": "boolean"
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
        "expandEncounterTemplate": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "sample": "9e7f0ff2-7255-40eb-ba15-3856a4ff12cf"
            },
            "patientId": {
              "type": "string",
              "sample": "94b926dd-7a76-4981-bd86-2056f842e831"
            },
            "patient": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string",
                  "sample": "94b926dd-7a76-4981-bd86-2056f842e831"
                },
                "fullName": {
                  "type": "string",
                  "sample": "大西 和子"
                },
                "serialNumber": {
                  "type": "string",
                  "sample": "17821"
                },
                "birthDate": {
                  "type": "string",
                  "sample": "1931-04-16"
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
                      "sample": "4b83de8c-1a9b-4626-a4d9-bff5ae509627"
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
                      "sample": "2026-01-10T06:30:25Z"
                    },
                    "patientId": {
                      "type": "string",
                      "sample": "94b926dd-7a76-4981-bd86-2056f842e831"
                    },
                    "patient": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string",
                          "sample": "94b926dd-7a76-4981-bd86-2056f842e831"
                        },
                        "fullName": {
                          "type": "string",
                          "sample": "大西 和子"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Patient"
                        }
                      }
                    },
                    "doctorId": {
                      "type": "string",
                      "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                    },
                    "doctor": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string",
                          "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                        },
                        "name": {
                          "type": "string",
                          "sample": "亀山　真一郎"
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
                      "sample": "BEFORE_CONSULTATION"
                    },
                    "visitTime": {
                      "type": "string",
                      "sample": "2026-01-10T06:30:37.066925Z"
                    },
                    "deleteTime": {
                      "type": "null"
                    },
                    "outpatientAccounting": {
                      "type": "null"
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
              "type": "null"
            },
            "hasBeenPublished": {
              "type": "boolean",
              "sample": false
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
                      "sample": "29a2773f-b1b7-4298-bf9f-09284eb0d92b"
                    },
                    "isDraft": {
                      "type": "boolean",
                      "sample": true
                    },
                    "encounterId": {
                      "type": "string",
                      "sample": "9e7f0ff2-7255-40eb-ba15-3856a4ff12cf"
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
                      "sample": 0
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
                      "sample": "2026-01-10T06:42:13.886577Z"
                    },
                    "updateUser": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string",
                          "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                        },
                        "name": {
                          "type": "string",
                          "sample": "亀山　真一郎"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "User"
                        }
                      }
                    },
                    "createTime": {
                      "type": "string",
                      "sample": "2026-01-10T06:30:35.263679Z"
                    },
                    "createUser": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string",
                          "sample": "c979e712-285c-48b0-992f-e06b603833a3"
                        },
                        "name": {
                          "type": "string",
                          "sample": "内田　くるみ"
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
                      "sample": "{\"blocks\":[{\"key\":\"97dhn\",\"text\":\"創部clear　滲出液少量あり\"..."
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

## ExpandEncounterTemplateToTemplate

**Hash**: `56c79ef1334a44023265e9298e12fe5029adbccb89c9102cb7b3ca3f3041190a`
**Endpoint**: `/graphql-v2`

### Variables

```json
{
  "sourceId": "string",
  "targetId": "string"
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
        "expandEncounterTemplateToTemplate": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "sample": "34716b45-0f71-4576-b6a5-43158ea093f8"
            },
            "startDate": {
              "type": "null"
            },
            "endDate": {
              "type": "null"
            },
            "title": {
              "type": "string",
              "sample": ""
            },
            "description": {
              "type": "string",
              "sample": ""
            },
            "folder": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string",
                  "sample": "6bb6421e-eead-45ff-af6e-d70509cb04a9"
                },
                "name": {
                  "type": "string",
                  "sample": "テスト"
                },
                "numOfContents": {
                  "type": "number",
                  "sample": 1
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
                      "sample": "df7368ba-2c80-48dc-a5f9-30d5ff257134"
                    },
                    "encounterTemplateId": {
                      "type": "string",
                      "sample": "34716b45-0f71-4576-b6a5-43158ea093f8"
                    },
                    "isDraft": {
                      "type": "boolean",
                      "sample": true
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
                      "type": "null"
                    }
                  }
                }
              ]
            },
            "isDraft": {
              "type": "boolean",
              "sample": false
            },
            "__typename": {
              "type": "string",
              "sample": "EncounterTemplate"
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
**Endpoint**: `/graphql`

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
        "getAccountingOrder": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "cb5d3a3a-f13e-4963-b660-cfb3f1b153b4"
            },
            "patient": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "94b926dd-7a76-4981-bd86-2056f842e831"
                },
                "fullName": {
                  "type": "string",
                  "sample": "大西 和子"
                },
                "fullNamePhonetic": {
                  "type": "string",
                  "sample": "オオニシ カズコ"
                },
                "serialNumber": {
                  "type": "string",
                  "sample": "17821"
                },
                "detail": {
                  "type": "object",
                  "properties": {
                    "patientUuid": {
                      "type": "string",
                      "sample": "94b926dd-7a76-4981-bd86-2056f842e831"
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
                          "sample": 1931
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
                    "__typename": {
                      "type": "string",
                      "sample": "PatientDetail"
                    }
                  }
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
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "performDate": {
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
                  "sample": 10
                },
                "__typename": {
                  "type": "string",
                  "sample": "Date"
                }
              }
            },
            "orderStatus": {
              "type": "string",
              "sample": "ORDER_STATUS_ON_HOLD"
            },
            "revokeDescription": {
              "type": "string",
              "sample": ""
            },
            "accountingInstructionGroups": {
              "type": "array",
              "length": 2,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "eddb4b04-3692-4557-9586-682544a4906e"
                    },
                    "note": {
                      "type": "string",
                      "sample": ""
                    },
                    "extendedShinryoShikibetsu": {
                      "type": "string",
                      "sample": "EXTENDED_SHINRYO_SHIKIBETSU_SHOCHI"
                    },
                    "instructions": {
                      "type": "array",
                      "length": 1,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "diagnosisInstruction": {
                              "type": "object",
                              "properties": {
                                "uuid": {
                                  "type": "string",
                                  "sample": "96f44673-8898-42b4-9df7-c3e79b02157d"
                                },
                                "mhlwDiagnosis": {
                                  "type": "object",
                                  "properties": {
                                    "id": {
                                      "type": "max_depth"
                                    },
                                    "code": {
                                      "type": "max_depth"
                                    },
                                    "name": {
                                      "type": "max_depth"
                                    },
                                    "unitCode": {
                                      "type": "max_depth"
                                    },
                                    "pointType": {
                                      "type": "max_depth"
                                    },
                                    "point": {
                                      "type": "max_depth"
                                    },
                                    "isStepValueRequiredForCalculation": {
                                      "type": "max_depth"
                                    },
                                    "stepValue": {
                                      "type": "max_depth"
                                    },
                                    "isDiminishing": {
                                      "type": "max_depth"
                                    },
                                    "startDate": {
                                      "type": "max_depth"
                                    },
                                    "endDate": {
                                      "type": "max_depth"
                                    },
                                    "applicableShinryoShikibetsuCodes": {
                                      "type": "max_depth"
                                    },
                                    "isInpatientUsable": {
                                      "type": "max_depth"
                                    },
                                    "isOutpatientUsable": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "quantity": {
                                  "type": "null"
                                },
                                "isAccountingIgnored": {
                                  "type": "boolean",
                                  "sample": false
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "DiagnosisInstruction"
                                }
                              }
                            },
                            "medicationDosageInstruction": {
                              "type": "null"
                            },
                            "equipmentInstruction": {
                              "type": "null"
                            },
                            "receiptComment": {
                              "type": "null"
                            },
                            "medicationUsageComment": {
                              "type": "null"
                            },
                            "nonHealthcareSystemInstruction": {
                              "type": "null"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "AccountingInstructionGroup_AccountingInstruction"
                            }
                          }
                        }
                      ]
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "AccountingInstructionGroup"
                    }
                  }
                }
              ]
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
                  "sample": 1768027234
                },
                "nanos": {
                  "type": "number",
                  "sample": 248872000
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
                  "sample": 1768027234
                },
                "nanos": {
                  "type": "number",
                  "sample": 248872000
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "encounterId": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "9e7f0ff2-7255-40eb-ba15-3856a4ff12cf"
                },
                "__typename": {
                  "type": "string",
                  "sample": "StringValue"
                }
              }
            },
            "extendedInsuranceCombinationId": {
              "type": "null"
            },
            "isDraft": {
              "type": "boolean",
              "sample": true
            },
            "isOutpatient": {
              "type": "boolean",
              "sample": true
            },
            "__typename": {
              "type": "string",
              "sample": "AccountingOrder"
            }
          }
        }
      }
    }
  }
}
```

---

## GetAccountingOrderTemplate

**Hash**: `799bd8ec6bc87c401ae25d3ad19065a4a3dcd50f07306031a6233bf3c3fcbfd7`
**Endpoint**: `/graphql`

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
        "getAccountingOrderTemplate": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "8ab98cea-8d81-464f-8842-448c773923a8"
            },
            "name": {
              "type": "string",
              "sample": ""
            },
            "startDate": {
              "type": "null"
            },
            "endDate": {
              "type": "null"
            },
            "encounterTemplateId": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "577861aa-e1ef-475f-ba97-c2b94b7c130f"
                },
                "__typename": {
                  "type": "string",
                  "sample": "StringValue"
                }
              }
            },
            "accountingInstructionGroups": {
              "type": "array",
              "length": 1,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "3eb9da6c-338e-4bbd-823c-5f475ecc1b2c"
                    },
                    "note": {
                      "type": "string",
                      "sample": ""
                    },
                    "extendedShinryoShikibetsu": {
                      "type": "string",
                      "sample": "EXTENDED_SHINRYO_SHIKIBETSU_SHOCHI"
                    },
                    "instructions": {
                      "type": "array",
                      "length": 3,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "diagnosisInstruction": {
                              "type": "object",
                              "properties": {
                                "uuid": {
                                  "type": "string",
                                  "sample": "a58b0e66-910f-440a-8cb3-b83a2d318fa9"
                                },
                                "mhlwDiagnosis": {
                                  "type": "object",
                                  "properties": {
                                    "id": {
                                      "type": "max_depth"
                                    },
                                    "code": {
                                      "type": "max_depth"
                                    },
                                    "name": {
                                      "type": "max_depth"
                                    },
                                    "unitCode": {
                                      "type": "max_depth"
                                    },
                                    "pointType": {
                                      "type": "max_depth"
                                    },
                                    "point": {
                                      "type": "max_depth"
                                    },
                                    "isStepValueRequiredForCalculation": {
                                      "type": "max_depth"
                                    },
                                    "stepValue": {
                                      "type": "max_depth"
                                    },
                                    "isDiminishing": {
                                      "type": "max_depth"
                                    },
                                    "startDate": {
                                      "type": "max_depth"
                                    },
                                    "endDate": {
                                      "type": "max_depth"
                                    },
                                    "applicableShinryoShikibetsuCodes": {
                                      "type": "max_depth"
                                    },
                                    "isInpatientUsable": {
                                      "type": "max_depth"
                                    },
                                    "isOutpatientUsable": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "quantity": {
                                  "type": "null"
                                },
                                "isAccountingIgnored": {
                                  "type": "boolean",
                                  "sample": false
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "DiagnosisInstruction"
                                }
                              }
                            },
                            "medicationDosageInstruction": {
                              "type": "null"
                            },
                            "equipmentInstruction": {
                              "type": "null"
                            },
                            "receiptComment": {
                              "type": "null"
                            },
                            "medicationUsageComment": {
                              "type": "null"
                            },
                            "nonHealthcareSystemInstruction": {
                              "type": "null"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "AccountingInstructionGroup_AccountingInstruction"
                            }
                          }
                        }
                      ]
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "AccountingInstructionGroup"
                    }
                  }
                }
              ]
            },
            "createTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1765280058
                },
                "nanos": {
                  "type": "number",
                  "sample": 533912000
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
                  "sample": 1765280081
                },
                "nanos": {
                  "type": "number",
                  "sample": 514437000
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "__typename": {
              "type": "string",
              "sample": "AccountingOrderTemplate"
            }
          }
        }
      }
    }
  }
}
```

---

## GetClinicalCalendarView

**Hash**: `74f284465206f367c4c544c20b020204478fa075a1fd3cb1bf3fd266ced026e1`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "patientUuid": "string",
    "baseDate": {
      "year": "number",
      "month": "number",
      "day": "number"
    },
    "beforeDateSize": "number",
    "afterDateSize": "number",
    "clinicalResourceHrns": [
      "string"
    ],
    "createUserUuids": [
      "string"
    ],
    "accountingOrderShinryoShikibetsus": "[]"
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
        "getClinicalCalendarView": {
          "type": "object",
          "properties": {
            "prescriptionOrders": {
              "type": "array",
              "length": 1,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "createTime": {
                      "type": "object",
                      "properties": {
                        "seconds": {
                          "type": "number",
                          "sample": 1767935358
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 807927000
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
                          "sample": "a90fc6a2-af34-4ad5-a92b-f4e2c9b82370"
                        },
                        "name": {
                          "type": "string",
                          "sample": "中川　眞弓"
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
                              "sample": "ナカガワ　マユミ"
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
                    "doctorUuid": {
                      "type": "string",
                      "sample": "5bbead66-558f-4382-a46d-140e9a304e4b"
                    },
                    "medicationCategory": {
                      "type": "string",
                      "sample": "MEDICATION_CATEGORY_EXTRA"
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
                      "sample": "ORDER_STATUS_DRAFT"
                    },
                    "patient": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "2b7c1f30-412d-4a6c-a857-350abbaf9a89"
                        },
                        "serialNumber": {
                          "type": "string",
                          "sample": "20201"
                        },
                        "serialNumberPrefix": {
                          "type": "string",
                          "sample": ""
                        },
                        "fullName": {
                          "type": "string",
                          "sample": "東川 之治"
                        },
                        "fullNamePhonetic": {
                          "type": "string",
                          "sample": "ヒガシカワ ユキハル"
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
                              "sample": "2b7c1f30-412d-4a6c-a857-350abbaf9a89"
                            },
                            "addressLine_1": {
                              "type": "string",
                              "sample": "香川県高松市塩江町安原下第2号179-2"
                            },
                            "addressLine_2": {
                              "type": "string",
                              "sample": ""
                            },
                            "postalCode": {
                              "type": "string",
                              "sample": "761-1502"
                            },
                            "email": {
                              "type": "string",
                              "sample": ""
                            },
                            "phoneNumber": {
                              "type": "string",
                              "sample": "897-0567"
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
                                  "sample": 1943
                                },
                                "month": {
                                  "type": "number",
                                  "sample": 6
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
                          "length": 1,
                          "items": [
                            {
                              "type": "string",
                              "sample": "PT入谷"
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
                      "sample": "2b7c1f30-412d-4a6c-a857-350abbaf9a89"
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
                                  "sample": 21
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
                              "length": 2,
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
                              "sample": true
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
                              "sample": "7e42cd0a-c30c-414b-bc10-632d4773e13a"
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
                    "updateTime": {
                      "type": "object",
                      "properties": {
                        "seconds": {
                          "type": "number",
                          "sample": 1767935358
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 807927000
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
                          "sample": "a90fc6a2-af34-4ad5-a92b-f4e2c9b82370"
                        },
                        "name": {
                          "type": "string",
                          "sample": "中川　眞弓"
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
                              "sample": "ナカガワ　マユミ"
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
                      "sample": "6a2876d9-379e-431f-9127-a79be7a50283"
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
              ]
            },
            "injectionOrders": {
              "type": "array",
              "items": "empty"
            },
            "imagingOrders": {
              "type": "array",
              "items": "empty"
            },
            "rehabilitationOrders": {
              "type": "array",
              "items": "empty"
            },
            "biopsyInspectionOrders": {
              "type": "array",
              "items": "empty"
            },
            "specimenInspectionOrders": {
              "type": "array",
              "items": "empty"
            },
            "nutritionOrders": {
              "type": "array",
              "items": "empty"
            },
            "accountingOrders": {
              "type": "array",
              "items": "empty"
            },
            "hospitalizationClinicalDocuments": {
              "type": "array",
              "length": 4,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "24580b16-3876-4a1b-b28d-2b42266ef204"
                    },
                    "hospitalizationUuid": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "string",
                          "sample": "0bfe94cd-19da-4056-9baf-c67f95a1f26b"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "StringValue"
                        }
                      }
                    },
                    "patientUuid": {
                      "type": "string",
                      "sample": "2b7c1f30-412d-4a6c-a857-350abbaf9a89"
                    },
                    "creatorUuid": {
                      "type": "string",
                      "sample": "5bbead66-558f-4382-a46d-140e9a304e4b"
                    },
                    "lastAuthorUuid": {
                      "type": "string",
                      "sample": "5bbead66-558f-4382-a46d-140e9a304e4b"
                    },
                    "editorData": {
                      "type": "string",
                      "sample": "{\n  \"blocks\": [\n    {\n      \"key\": \"ad7fj\",\n      ..."
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
                          "sample": 1767920100
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
                          "sample": 1767920155
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 704021000
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
                          "sample": 1767920155
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 704021000
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
                          "sample": "2b7c1f30-412d-4a6c-a857-350abbaf9a89"
                        },
                        "serialNumber": {
                          "type": "string",
                          "sample": "20201"
                        },
                        "serialNumberPrefix": {
                          "type": "string",
                          "sample": ""
                        },
                        "fullName": {
                          "type": "string",
                          "sample": "東川 之治"
                        },
                        "fullNamePhonetic": {
                          "type": "string",
                          "sample": "ヒガシカワ ユキハル"
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
                              "sample": "2b7c1f30-412d-4a6c-a857-350abbaf9a89"
                            },
                            "addressLine_1": {
                              "type": "string",
                              "sample": "香川県高松市塩江町安原下第2号179-2"
                            },
                            "addressLine_2": {
                              "type": "string",
                              "sample": ""
                            },
                            "postalCode": {
                              "type": "string",
                              "sample": "761-1502"
                            },
                            "email": {
                              "type": "string",
                              "sample": ""
                            },
                            "phoneNumber": {
                              "type": "string",
                              "sample": "897-0567"
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
                                  "sample": 1943
                                },
                                "month": {
                                  "type": "number",
                                  "sample": 6
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
                          "length": 1,
                          "items": [
                            {
                              "type": "string",
                              "sample": "PT入谷"
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
                    "creator": {
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
                      "sample": "ClinicalDocument"
                    }
                  }
                }
              ]
            },
            "nursingJournals": {
              "type": "array",
              "items": "empty"
            },
            "rehabilitationDocuments": {
              "type": "array",
              "items": "empty"
            },
            "surgeryDocuments": {
              "type": "array",
              "items": "empty"
            },
            "customClinicalDocumentCollections": {
              "type": "array",
              "length": 1,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "clinicalDocumentCustomTypeUuid": {
                      "type": "string",
                      "sample": "e4ac1e1c-40e2-4c19-9df4-aa57adae7d4f"
                    },
                    "customClinicalDocuments": {
                      "type": "array",
                      "length": 10,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "d4d60cba-fd15-4286-bf28-9d6a54d1e699"
                            },
                            "hospitalizationUuid": {
                              "type": "object",
                              "properties": {
                                "value": {
                                  "type": "string",
                                  "sample": "0bfe94cd-19da-4056-9baf-c67f95a1f26b"
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "StringValue"
                                }
                              }
                            },
                            "patientUuid": {
                              "type": "string",
                              "sample": "2b7c1f30-412d-4a6c-a857-350abbaf9a89"
                            },
                            "creatorUuid": {
                              "type": "string",
                              "sample": "e68a432f-d7c8-4bd7-9ce4-b125bd412e53"
                            },
                            "lastAuthorUuid": {
                              "type": "string",
                              "sample": "e68a432f-d7c8-4bd7-9ce4-b125bd412e53"
                            },
                            "editorData": {
                              "type": "string",
                              "sample": "{\n  \"blocks\": [\n    {\n      \"key\": \"5belp\",\n      ..."
                            },
                            "type": {
                              "type": "object",
                              "properties": {
                                "clinicalDocumentCustomTypeUuid": {
                                  "type": "object",
                                  "properties": {
                                    "value": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "type": {
                                  "type": "string",
                                  "sample": "CUSTOM"
                                },
                                "excerptType": {
                                  "type": "string",
                                  "sample": "NONE"
                                },
                                "clinicalDocumentCustomType": {
                                  "type": "object",
                                  "properties": {
                                    "uuid": {
                                      "type": "max_depth"
                                    },
                                    "name": {
                                      "type": "max_depth"
                                    },
                                    "excerptType": {
                                      "type": "max_depth"
                                    },
                                    "displayOrder": {
                                      "type": "max_depth"
                                    },
                                    "isDeletable": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
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
                                  "sample": 1767921600
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
                                  "sample": 1767925655
                                },
                                "nanos": {
                                  "type": "number",
                                  "sample": 159773000
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
                                  "sample": 1767946687
                                },
                                "nanos": {
                                  "type": "number",
                                  "sample": 220820000
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
                                  "sample": "2b7c1f30-412d-4a6c-a857-350abbaf9a89"
                                },
                                "serialNumber": {
                                  "type": "string",
                                  "sample": "20201"
                                },
                                "serialNumberPrefix": {
                                  "type": "string",
                                  "sample": ""
                                },
                                "fullName": {
                                  "type": "string",
                                  "sample": "東川 之治"
                                },
                                "fullNamePhonetic": {
                                  "type": "string",
                                  "sample": "ヒガシカワ ユキハル"
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
                                  "length": 1,
                                  "items": [
                                    {
                                      "type": "max_depth"
                                    }
                                  ]
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
                            "lastAuthor": {
                              "type": "object",
                              "properties": {
                                "uuid": {
                                  "type": "string",
                                  "sample": "e68a432f-d7c8-4bd7-9ce4-b125bd412e53"
                                },
                                "name": {
                                  "type": "string",
                                  "sample": "真鍋　仁恵"
                                },
                                "namePhonetic": {
                                  "type": "object",
                                  "properties": {
                                    "__typename": {
                                      "type": "max_depth"
                                    },
                                    "value": {
                                      "type": "max_depth"
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
                                  "sample": "e68a432f-d7c8-4bd7-9ce4-b125bd412e53"
                                },
                                "name": {
                                  "type": "string",
                                  "sample": "真鍋　仁恵"
                                },
                                "namePhonetic": {
                                  "type": "object",
                                  "properties": {
                                    "__typename": {
                                      "type": "max_depth"
                                    },
                                    "value": {
                                      "type": "max_depth"
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
                      ]
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "GetClinicalCalendarViewResponse_CustomClinicalDocu..."
                    }
                  }
                }
              ]
            },
            "vitalSigns": {
              "type": "array",
              "length": 4,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "67a3d5f4-7f73-465d-a00d-d10586bde5d6"
                    },
                    "patientUuid": {
                      "type": "string",
                      "sample": "2b7c1f30-412d-4a6c-a857-350abbaf9a89"
                    },
                    "recordTime": {
                      "type": "object",
                      "properties": {
                        "seconds": {
                          "type": "number",
                          "sample": 1767921000
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
                    "bloodPressureLowerBound": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "number",
                          "sample": 640
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Frac10"
                        }
                      }
                    },
                    "bloodPressureUpperBound": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "number",
                          "sample": 1300
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Frac10"
                        }
                      }
                    },
                    "createTime": {
                      "type": "object",
                      "properties": {
                        "seconds": {
                          "type": "number",
                          "sample": 1767927446
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 552986000
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
                          "sample": "e68a432f-d7c8-4bd7-9ce4-b125bd412e53"
                        },
                        "name": {
                          "type": "string",
                          "sample": "真鍋　仁恵"
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
                              "sample": "マナベ　ヒトエ"
                            }
                          }
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "User"
                        }
                      }
                    },
                    "updateTime": {
                      "type": "object",
                      "properties": {
                        "seconds": {
                          "type": "number",
                          "sample": 1767927446
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 552986000
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
                          "sample": "e68a432f-d7c8-4bd7-9ce4-b125bd412e53"
                        },
                        "name": {
                          "type": "string",
                          "sample": "真鍋　仁恵"
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
                              "sample": "マナベ　ヒトエ"
                            }
                          }
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "User"
                        }
                      }
                    },
                    "pulseRate": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "number",
                          "sample": 970
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Frac10"
                        }
                      }
                    },
                    "respiration": {
                      "type": "null"
                    },
                    "temperature": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "number",
                          "sample": 366
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Frac10"
                        }
                      }
                    },
                    "spo2": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "number",
                          "sample": 930
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Frac10"
                        }
                      }
                    },
                    "bloodSugar": {
                      "type": "null"
                    },
                    "bloodPressureNote": {
                      "type": "string",
                      "sample": ""
                    },
                    "pulseRateNote": {
                      "type": "string",
                      "sample": ""
                    },
                    "respirationNote": {
                      "type": "string",
                      "sample": ""
                    },
                    "temperatureNote": {
                      "type": "string",
                      "sample": ""
                    },
                    "spo2Note": {
                      "type": "string",
                      "sample": ""
                    },
                    "bloodSugarNote": {
                      "type": "string",
                      "sample": ""
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "VitalSign"
                    }
                  }
                }
              ]
            },
            "patientBodyMeasurements": {
              "type": "array",
              "items": "empty"
            },
            "clinicalQuantitativeDataModuleCollections": {
              "type": "array",
              "length": 1,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "cqdDefHrn": {
                      "type": "string",
                      "sample": "//henry-app.jp/clinicalQuantitativeDataDef/custom/..."
                    },
                    "clinicalQuantitativeDataModules": {
                      "type": "array",
                      "length": 2,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "dataId": {
                              "type": "string",
                              "sample": "e816ea6e-2c7c-4d18-aa84-3d29e23e28b3"
                            },
                            "displayType": {
                              "type": "string",
                              "sample": "TIMELINE"
                            },
                            "title": {
                              "type": "string",
                              "sample": "処置🪙"
                            },
                            "recordDateRange": {
                              "type": "object",
                              "properties": {
                                "start": {
                                  "type": "object",
                                  "properties": {
                                    "year": {
                                      "type": "max_depth"
                                    },
                                    "month": {
                                      "type": "max_depth"
                                    },
                                    "day": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "end": {
                                  "type": "object",
                                  "properties": {
                                    "year": {
                                      "type": "max_depth"
                                    },
                                    "month": {
                                      "type": "max_depth"
                                    },
                                    "day": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "DateRange"
                                }
                              }
                            },
                            "recordTime": {
                              "type": "object",
                              "properties": {
                                "hours": {
                                  "type": "number",
                                  "sample": 15
                                },
                                "minutes": {
                                  "type": "number",
                                  "sample": 17
                                },
                                "seconds": {
                                  "type": "number",
                                  "sample": 1
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "Time"
                                }
                              }
                            },
                            "entries": {
                              "type": "array",
                              "length": 1,
                              "items": [
                                {
                                  "type": "object",
                                  "properties": {
                                    "id": {
                                      "type": "max_depth"
                                    },
                                    "name": {
                                      "type": "max_depth"
                                    },
                                    "value": {
                                      "type": "max_depth"
                                    },
                                    "unit": {
                                      "type": "max_depth"
                                    },
                                    "supplements": {
                                      "type": "max_depth"
                                    },
                                    "source": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                }
                              ]
                            },
                            "cqdDefHrn": {
                              "type": "string",
                              "sample": "//henry-app.jp/clinicalQuantitativeDataDef/custom/..."
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "ClinicalQuantitativeDataModule"
                            }
                          }
                        }
                      ]
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "GetClinicalCalendarViewResponse_ClinicalQuantitati..."
                    }
                  }
                }
              ]
            },
            "outsideInspectionReportGroups": {
              "type": "array",
              "items": "empty"
            },
            "__typename": {
              "type": "string",
              "sample": "GetClinicalCalendarViewResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## GetClinicalDocument

**Hash**: `55c6b8a226f7ba8a7dc70e66fe0a93bb194f4923863ad9efe4060210b1b0430f`
**Endpoint**: `/graphql`

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
              "sample": "58560a5c-e152-43a2-a7b1-8071e06b55fe"
            },
            "hospitalizationUuid": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "f7f11e89-731b-415b-aa6b-3dee46410df5"
                },
                "__typename": {
                  "type": "string",
                  "sample": "StringValue"
                }
              }
            },
            "patientUuid": {
              "type": "string",
              "sample": "2a98bf55-36ac-41d0-95e6-0104077a14ee"
            },
            "creatorUuid": {
              "type": "string",
              "sample": "5bbead66-558f-4382-a46d-140e9a304e4b"
            },
            "lastAuthorUuid": {
              "type": "string",
              "sample": "5bbead66-558f-4382-a46d-140e9a304e4b"
            },
            "editorData": {
              "type": "string",
              "sample": "{\n  \"blocks\": [\n    {\n      \"key\": \"en8rb\",\n      ..."
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
                  "sample": 1767918480
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
                  "sample": 1767918814
                },
                "nanos": {
                  "type": "number",
                  "sample": 962628000
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
                  "sample": 1767918814
                },
                "nanos": {
                  "type": "number",
                  "sample": 962628000
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
                  "sample": "2a98bf55-36ac-41d0-95e6-0104077a14ee"
                },
                "serialNumber": {
                  "type": "string",
                  "sample": "20187"
                },
                "serialNumberPrefix": {
                  "type": "string",
                  "sample": ""
                },
                "fullName": {
                  "type": "string",
                  "sample": "笹田 重富"
                },
                "fullNamePhonetic": {
                  "type": "string",
                  "sample": "ササダ シゲトミ"
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
                      "sample": "2a98bf55-36ac-41d0-95e6-0104077a14ee"
                    },
                    "addressLine_1": {
                      "type": "string",
                      "sample": "香川県さぬき市志度2690-5"
                    },
                    "addressLine_2": {
                      "type": "string",
                      "sample": ""
                    },
                    "postalCode": {
                      "type": "string",
                      "sample": "769-2101"
                    },
                    "email": {
                      "type": "string",
                      "sample": ""
                    },
                    "phoneNumber": {
                      "type": "string",
                      "sample": "09028213193"
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
                          "sample": 1941
                        },
                        "month": {
                          "type": "number",
                          "sample": 6
                        },
                        "day": {
                          "type": "number",
                          "sample": 28
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
                  "length": 4,
                  "items": [
                    {
                      "type": "string",
                      "sample": "宇都宮Dr"
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
            "creator": {
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
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "pathType": "string"
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
        "getFileUploadUrl": {
          "type": "object",
          "properties": {
            "uploadUrl": {
              "type": "string",
              "sample": "https://storage.googleapis.com/henry-files-product..."
            },
            "fileUrl": {
              "type": "string",
              "sample": "gs://henry-files-production/organizations/ce6b556b..."
            },
            "__typename": {
              "type": "string",
              "sample": "GetFileUploadUrlResponse"
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
**Endpoint**: `/graphql`

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
        "getImagingOrder": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "ee9c766e-791b-4e8a-852e-dbbb7d8d0321"
            },
            "patientUuid": {
              "type": "string",
              "sample": "46f7d421-872d-4074-b323-61acd59d8d59"
            },
            "patient": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "46f7d421-872d-4074-b323-61acd59d8d59"
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
                  "sample": 10
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
                  "sample": 1768022647
                },
                "nanos": {
                  "type": "number",
                  "sample": 324894000
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
                  "sample": 1768022649
                },
                "nanos": {
                  "type": "number",
                  "sample": 284706000
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
                  "sample": "ee9c766e-791b-4e8a-852e-dbbb7d8d0321"
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
                                  "sample": "ce5837e4-ce30-4718-a9ff-43081778f23f"
                                },
                                "uuid": {
                                  "type": "string",
                                  "sample": "c6785df1-10d5-4e52-a101-fceecf4987f9"
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
                                  "sample": "61kVp,10mAs,120cm"
                                },
                                "note": {
                                  "type": "string",
                                  "sample": "正側2R"
                                },
                                "laterality": {
                                  "type": "string",
                                  "sample": "BILATERAL"
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
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "919dd21c-75b5-41b1-b292-0f3b17ac9e20"
                },
                "__typename": {
                  "type": "string",
                  "sample": "StringValue"
                }
              }
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
              "sample": true
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

## GetImagingOrderTemplate

**Hash**: `df8736f1c4f33fa03a068c538428f700db04eea60080dd8ca703b286209bdd70`
**Endpoint**: `/graphql`

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
        "getImagingOrderTemplate": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "ca6fa539-b120-4354-97d3-49340b2792f0"
            },
            "name": {
              "type": "string",
              "sample": "☆XP / 頭〜体幹 / 肋骨"
            },
            "imagingModality": {
              "type": "string",
              "sample": "IMAGING_MODALITY_PLAIN_RADIOGRAPHY_DIGITAL"
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
                  "sample": 1766836899
                },
                "nanos": {
                  "type": "number",
                  "sample": 836169000
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
                              "sample": "c15c69e1-4ed5-4be3-ba6f-27b662347312"
                            },
                            "uuid": {
                              "type": "string",
                              "sample": "0c1e6ebe-9deb-4240-8e85-4e8a1ffc7045"
                            },
                            "bodyPositions": {
                              "type": "array",
                              "length": 1,
                              "items": [
                                {
                                  "type": "string",
                                  "sample": "BODY_POSITION_ANY"
                                }
                              ]
                            },
                            "filmCount": {
                              "type": "null"
                            },
                            "configuration": {
                              "type": "string",
                              "sample": "76kVp,63mAs,120cm"
                            },
                            "note": {
                              "type": "string",
                              "sample": ""
                            },
                            "laterality": {
                              "type": "string",
                              "sample": "LATERALITY_NONE"
                            },
                            "bodySite": {
                              "type": "object",
                              "properties": {
                                "uuid": {
                                  "type": "string",
                                  "sample": "c15c69e1-4ed5-4be3-ba6f-27b662347312"
                                },
                                "name": {
                                  "type": "string",
                                  "sample": "肋骨"
                                },
                                "lateralityRequirement": {
                                  "type": "boolean",
                                  "sample": true
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "LocalBodySite"
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
      }
    }
  }
}
```

---

## GetInjectionOrderTemplate

**Hash**: `81cb86700ee3cb750a4df8339830786fbd9d1eb2ac71439a40bad8e127772605`
**Endpoint**: `/graphql`

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
        "getInjectionOrderTemplate": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "77cd2b3d-3e75-493d-89cc-800439d042fb"
            },
            "name": {
              "type": "string",
              "sample": ""
            },
            "medicationCategory": {
              "type": "string",
              "sample": "MEDICATION_CATEGORY_UNSPECIFIED"
            },
            "note": {
              "type": "string",
              "sample": ""
            },
            "startDate": {
              "type": "null"
            },
            "endDate": {
              "type": "null"
            },
            "createTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1768136905
                },
                "nanos": {
                  "type": "number",
                  "sample": 966901000
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
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
                      "sample": "90ef21e6-6605-4fa8-9858-32f6f071bfb3"
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
                    "boundsDurationDays": {
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
                          "type": "null"
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
                          "sample": "013dfdc0-2893-4da9-b221-86e7f0fe9986"
                        },
                        "name": {
                          "type": "string",
                          "sample": "関節腔内注射"
                        },
                        "masterId": {
                          "type": "string",
                          "sample": "1_10"
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
                          "sample": "013dfdc0-2893-4da9-b221-86e7f0fe9986"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "StringValue"
                        }
                      }
                    },
                    "instructions": {
                      "type": "array",
                      "length": 3,
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
            "encounterTemplateId": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "dca65673-2768-42ae-89a5-df8c1957ad8c"
                },
                "__typename": {
                  "type": "string",
                  "sample": "StringValue"
                }
              }
            },
            "__typename": {
              "type": "string",
              "sample": "InjectionOrderTemplate"
            }
          }
        }
      }
    }
  }
}
```

---

## GetIntractableDiseaseType

**Hash**: `43a2aa4df6a57fa4143165ca8826c63c79fcd75be902200588b7371a9423250f`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "diseaseCode": "string",
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
        "getIntractableDiseaseType": {
          "type": "object",
          "properties": {
            "defaultIntractableDiseaseType": {
              "type": "string",
              "sample": "NOT_APPLICABLE"
            },
            "__typename": {
              "type": "string",
              "sample": "GetIntractableDiseaseTypeResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## GetNutritionOrder

**Hash**: `84caca458bad7ff144d3faab86a1d12c82a136d61303c742d23d71e32611a982`
**Endpoint**: `/graphql`

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
        "getNutritionOrder": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "612da1ff-a920-4062-b052-c12562c02218"
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
                  "sample": 28
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
                  "sample": 1766908895
                },
                "nanos": {
                  "type": "number",
                  "sample": 275887000
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
                  "sample": 1766909102
                },
                "nanos": {
                  "type": "number",
                  "sample": 411028000
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
                  "sample": "612da1ff-a920-4062-b052-c12562c02218"
                },
                "dietaryRegimenUuid": {
                  "type": "null"
                },
                "patientReceiptDiseaseUuid": {
                  "type": "null"
                },
                "startTiming": {
                  "type": "string",
                  "sample": "MEAL_TIMING_BREAKFAST"
                },
                "endTiming": {
                  "type": "string",
                  "sample": "MEAL_TIMING_DINNER"
                },
                "instruction": {
                  "type": "string",
                  "sample": ""
                },
                "note": {
                  "type": "string",
                  "sample": ""
                },
                "supplies": {
                  "type": "array",
                  "length": 1,
                  "items": [
                    {
                      "type": "object",
                      "properties": {
                        "foodUuid": {
                          "type": "string",
                          "sample": "bc4ac121-8e5d-4f8d-b578-82c1ac69de52"
                        },
                        "timing": {
                          "type": "string",
                          "sample": "MEAL_TIMING_EVERY"
                        },
                        "quantity": {
                          "type": "object",
                          "properties": {
                            "value": {
                              "type": "number",
                              "sample": 100
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "Int32Value"
                            }
                          }
                        },
                        "food": {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "bc4ac121-8e5d-4f8d-b578-82c1ac69de52"
                            },
                            "type": {
                              "type": "string",
                              "sample": "FOOD_TYPE_ORAL_DIET"
                            },
                            "name": {
                              "type": "string",
                              "sample": "米飯200g"
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
                                    "displayName": {
                                      "type": "max_depth"
                                    },
                                    "quantity": {
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
                              "sample": "Food"
                            }
                          }
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "NutritionOrderDetail_Supply"
                        }
                      }
                    }
                  ]
                },
                "dietaryRegimen": {
                  "type": "null"
                },
                "patientReceiptDisease": {
                  "type": "null"
                },
                "__typename": {
                  "type": "string",
                  "sample": "NutritionOrderDetail"
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
            "hasSpecialDietCharges": {
              "type": "boolean",
              "sample": false
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
              "sample": "NutritionOrder"
            }
          }
        }
      }
    }
  }
}
```

---

## GetOrderNotifiableViewAction

**Hash**: `f987a2d855c27ac08a78421fe2e7232be9845e596b9dbfd6c322a42f3f04f4a6`
**Endpoint**: `/graphql`

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
**Endpoint**: `/graphql`

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
        "getOrganization": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "ce6b556b-2a8d-4fce-b8dd-89ba638fc825"
            },
            "name": {
              "type": "string",
              "sample": "医療法人社団弘徳会 マオカ病院"
            },
            "displayName": {
              "type": "string",
              "sample": "医社）弘徳会マオカ病院"
            },
            "institutionCode": {
              "type": "string",
              "sample": "0118153"
            },
            "sskRegisteredName": {
              "type": "string",
              "sample": "医社）弘徳会マオカ病院"
            },
            "founderName": {
              "type": "string",
              "sample": "宇都宮　栄"
            },
            "detail": {
              "type": "object",
              "properties": {
                "organizationUuid": {
                  "type": "string",
                  "sample": "ce6b556b-2a8d-4fce-b8dd-89ba638fc825"
                },
                "addressLine": {
                  "type": "string",
                  "sample": "香川県高松市瓦町一丁目１２番地４５"
                },
                "prefectureCode": {
                  "type": "string",
                  "sample": "37"
                },
                "bedCount": {
                  "type": "number",
                  "sample": 58
                },
                "defaultPrescriptionSystem": {
                  "type": "string",
                  "sample": "PRESCRIPTION_SYSTEM_OUT_SOURCED"
                },
                "phoneNumber": {
                  "type": "string",
                  "sample": "087-862-8888"
                },
                "qualifiedInvoiceIssuerNumber": {
                  "type": "string",
                  "sample": ""
                },
                "__typename": {
                  "type": "string",
                  "sample": "OrganizationDetail"
                }
              }
            },
            "__typename": {
              "type": "string",
              "sample": "Organization"
            }
          }
        }
      }
    }
  }
}
```

---

## getOrganizationFeatureFlag

**Hash**: `7ba95846d22d0cca070c785c7831add43e0bbdc07ca06ef008d46b296725c7cb`
**Endpoint**: `/graphql`

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
        "getOrganizationFeatureFlag": {
          "type": "object",
          "properties": {
            "organizationUuid": {
              "type": "string",
              "sample": "ce6b556b-2a8d-4fce-b8dd-89ba638fc825"
            },
            "outpatientEnabled": {
              "type": "boolean",
              "sample": true
            },
            "inpatientEnabled": {
              "type": "boolean",
              "sample": true
            },
            "assignmentEnabled": {
              "type": "boolean",
              "sample": true
            },
            "clinicalDocumentEnabled": {
              "type": "boolean",
              "sample": true
            },
            "clinicalQuantitativeDataEnabled": {
              "type": "boolean",
              "sample": true
            },
            "defaultPaymentType": {
              "type": "string",
              "sample": "PAYMENT_TYPE_INSURED"
            },
            "outsideInspectionEnabled": {
              "type": "boolean",
              "sample": true
            },
            "refillEnabled": {
              "type": "boolean",
              "sample": true
            },
            "receiptBarcodeEnabled": {
              "type": "boolean",
              "sample": true
            },
            "intractableDiseaseTypeDefaultValueEnabled": {
              "type": "boolean",
              "sample": true
            },
            "requestIndexPatientOrderListEnabled": {
              "type": "boolean",
              "sample": true
            },
            "imagingOrderConsultationEditorLinkEnabled": {
              "type": "boolean",
              "sample": true
            },
            "henEnabled": {
              "type": "boolean",
              "sample": true
            },
            "oqsEnabled": {
              "type": "boolean",
              "sample": true
            },
            "insuranceBillingInfoEnabled": {
              "type": "boolean",
              "sample": true
            },
            "settingIngredientAmountContentEnabled": {
              "type": "boolean",
              "sample": true
            },
            "sessionEditorLockEnabled": {
              "type": "boolean",
              "sample": true
            },
            "dataSubmissionAdditionalPointEnabled": {
              "type": "boolean",
              "sample": true
            },
            "autoAdditionalPointVersion": {
              "type": "number",
              "sample": 1
            },
            "validationVersion": {
              "type": "number",
              "sample": 1
            },
            "basicDispensingTechnologyFeeAvailable": {
              "type": "boolean",
              "sample": true
            },
            "intractableDiseasePrescriptionManagementAdditionalFeeEnabled": {
              "type": "boolean",
              "sample": true
            },
            "sessionAccountingReportFooterEnabled": {
              "type": "boolean",
              "sample": true
            },
            "clientCertificateRequired": {
              "type": "boolean",
              "sample": false
            },
            "searchChargeItemDefinitionsInConsultationEnabled": {
              "type": "boolean",
              "sample": false
            },
            "surgeryDocumentEnabled": {
              "type": "boolean",
              "sample": true
            },
            "bulkSessionPaymentEnabled": {
              "type": "boolean",
              "sample": true
            },
            "tmp_202312NutritionOrderEmptySupplyCalculationEnabled": {
              "type": "boolean",
              "sample": false
            },
            "tmp_202311DailyPaymentFileEnabled": {
              "type": "boolean",
              "sample": true
            },
            "tmp_202312OldFf1Enabled": {
              "type": "boolean",
              "sample": false
            },
            "tmp_20240318OqsPublicExpenseEnabled": {
              "type": "boolean",
              "sample": true
            },
            "tmp_20240402OkusuriTechoStickerSinglePageEnabled": {
              "type": "boolean",
              "sample": true
            },
            "forbidReceiptOutput": {
              "type": "boolean",
              "sample": false
            },
            "readonlyModeEnabled": {
              "type": "boolean",
              "sample": false
            },
            "glimCriteriaEnabled": {
              "type": "boolean",
              "sample": true
            },
            "taxPaymentForSelfPaiedHealthcareSystemConsultationsEnabled": {
              "type": "boolean",
              "sample": false
            },
            "useCompactSessionInvoiceStatement": {
              "type": "boolean",
              "sample": true
            },
            "tmp_20240523Ff1_2024Enabled": {
              "type": "boolean",
              "sample": true
            },
            "actionPanelEnabled": {
              "type": "boolean",
              "sample": true
            },
            "tmp_20240612ShitsuryoSagakuOverrideEnabled": {
              "type": "boolean",
              "sample": true
            },
            "__typename": {
              "type": "string",
              "sample": "OrganizationFeatureFlag"
            }
          }
        }
      }
    }
  }
}
```

---

## GetOutpatientAccountingBilling

**Hash**: `4717ae37ce4d08c8d8e4a0996e2d3c9cdd826bf9258cf51c30963bd29c4c5cb5`
**Endpoint**: `/graphql-v2`

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
              "sample": "671959af-edea-11f0-9110-d30bcfb19e18"
            },
            "billing": {
              "type": "null"
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
**Endpoint**: `/graphql`

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
        "getPatient": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "a581024d-2dd9-436e-a509-631953666664"
            },
            "serialNumber": {
              "type": "string",
              "sample": "17117"
            },
            "serialNumberPrefix": {
              "type": "string",
              "sample": ""
            },
            "fullName": {
              "type": "string",
              "sample": "加藤 和子"
            },
            "fullNamePhonetic": {
              "type": "string",
              "sample": "カトウ カズコ"
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
                  "sample": "a581024d-2dd9-436e-a509-631953666664"
                },
                "addressLine_1": {
                  "type": "string",
                  "sample": "高松市今里町1丁目443"
                },
                "addressLine_2": {
                  "type": "string",
                  "sample": ""
                },
                "postalCode": {
                  "type": "string",
                  "sample": "760-0078"
                },
                "email": {
                  "type": "string",
                  "sample": ""
                },
                "phoneNumber": {
                  "type": "string",
                  "sample": "09031898711"
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
                      "sample": 1948
                    },
                    "month": {
                      "type": "number",
                      "sample": 6
                    },
                    "day": {
                      "type": "number",
                      "sample": 22
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "Date"
                    }
                  }
                },
                "memo": {
                  "type": "string",
                  "sample": "高額0609,0610,0612,0710,"
                },
                "__typename": {
                  "type": "string",
                  "sample": "PatientDetail"
                }
              }
            },
            "tags": {
              "type": "array",
              "length": 5,
              "items": [
                {
                  "type": "string",
                  "sample": "護送"
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
            },
            "latestBodyMeasurement": {
              "type": "null"
            }
          }
        }
      }
    }
  }
}
```

---

## GetPatientDocumentTemplate

**Hash**: `2e8d4bf116c07239ae42d35da28f895183f980ba9b411dbcca6a18e49d0013d1`
**Endpoint**: `/graphql`

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

## GetPatientPrescriptionIssueSelect

**Hash**: `c035ec980ecd2b9809604fbca00c2e24c6d5b8e78ee242ec5702ad33cbd69f60`
**Endpoint**: `/graphql-v2`

### Variables

```json
{
  "patientId": "string"
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
        "getPrescriptionIssueSelect": {
          "type": "object",
          "properties": {
            "prescriptionIssueSelect": {
              "type": "number",
              "sample": 2
            },
            "__typename": {
              "type": "string",
              "sample": "GetPrescriptionIssueSelectResponse"
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
**Endpoint**: `/graphql`

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
        "getPrescriptionOrder": {
          "type": "object",
          "properties": {
            "createTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1768021764
                },
                "nanos": {
                  "type": "number",
                  "sample": 580182000
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
              "sample": "MEDICATION_CATEGORY_OUT_OF_HOSPITAL"
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
              "sample": "ORDER_STATUS_ON_HOLD"
            },
            "patient": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
                },
                "serialNumber": {
                  "type": "string",
                  "sample": "16581"
                },
                "serialNumberPrefix": {
                  "type": "string",
                  "sample": ""
                },
                "fullName": {
                  "type": "string",
                  "sample": "大平 逸郎"
                },
                "fullNamePhonetic": {
                  "type": "string",
                  "sample": "オオヒラ イツロウ"
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
                      "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
                    },
                    "addressLine_1": {
                      "type": "string",
                      "sample": "高松市 高松町78番地10プレジデント屋島304"
                    },
                    "addressLine_2": {
                      "type": "string",
                      "sample": ""
                    },
                    "postalCode": {
                      "type": "string",
                      "sample": "7610104"
                    },
                    "email": {
                      "type": "string",
                      "sample": ""
                    },
                    "phoneNumber": {
                      "type": "string",
                      "sample": "843-6172"
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
                          "sample": 1961
                        },
                        "month": {
                          "type": "number",
                          "sample": 4
                        },
                        "day": {
                          "type": "number",
                          "sample": 19
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Date"
                        }
                      }
                    },
                    "memo": {
                      "type": "string",
                      "sample": "TEL:09031830046\n 医療情報取得加算(再)07年12月\n一包化処方"
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
            "patientUuid": {
              "type": "string",
              "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
            },
            "revokeDescription": {
              "type": "string",
              "sample": ""
            },
            "rps": {
              "type": "array",
              "length": 5,
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
                      "sample": "毎週木曜日、MTX4mg/w          　　"
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
                          "sample": 2
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
                      "sample": "b0a8dfea-b0c5-4ebb-af12-9f2f14531ea6"
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
                  "sample": 2026
                },
                "month": {
                  "type": "number",
                  "sample": 1
                },
                "day": {
                  "type": "number",
                  "sample": 10
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
                  "sample": 1768021764
                },
                "nanos": {
                  "type": "number",
                  "sample": 580182000
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
              "sample": "501f1220-9456-45bd-98e8-9576a0372ea1"
            },
            "encounterId": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "e9504d33-4c9a-4175-a65f-1417b8f9a23d"
                },
                "__typename": {
                  "type": "string",
                  "sample": "StringValue"
                }
              }
            },
            "extendedInsuranceCombinationId": {
              "type": "null"
            },
            "isDraft": {
              "type": "boolean",
              "sample": true
            },
            "isOutpatient": {
              "type": "boolean",
              "sample": true
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

## GetPrescriptionOrderTemplate

**Hash**: `00e7fbf4834855b4c6c7bb256c58d3a98204e0677b7649570ccc6b172ef582e7`
**Endpoint**: `/graphql`

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
        "getPrescriptionOrderTemplate": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "64d5d036-a91c-4dfb-88c1-9e7a9f2081c7"
            },
            "name": {
              "type": "string",
              "sample": ""
            },
            "medicationCategory": {
              "type": "string",
              "sample": "MEDICATION_CATEGORY_OUT_OF_HOSPITAL"
            },
            "note": {
              "type": "string",
              "sample": ""
            },
            "startDate": {
              "type": "null"
            },
            "endDate": {
              "type": "null"
            },
            "createTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1768097941
                },
                "nanos": {
                  "type": "number",
                  "sample": 961508000
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "rps": {
              "type": "array",
              "length": 7,
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
                                  "sample": "65e71499-a4cf-42b5-ac63-07e4abab35ff"
                                },
                                "text": {
                                  "type": "string",
                                  "sample": "１日３回朝昼夕食後"
                                },
                                "useAsNeeded": {
                                  "type": "boolean",
                                  "sample": false
                                },
                                "timings": {
                                  "type": "array",
                                  "length": 3,
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
                                  "sample": "65e71499-a4cf-42b5-ac63-07e4abab35ff"
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
                          "sample": 14
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
                      "length": 2,
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
                      "sample": "5606e0bb-a5c6-4b7f-8596-44476ec10af8"
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
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "34716b45-0f71-4576-b6a5-43158ea093f8"
                },
                "__typename": {
                  "type": "string",
                  "sample": "StringValue"
                }
              }
            },
            "__typename": {
              "type": "string",
              "sample": "PrescriptionOrderTemplate"
            }
          }
        }
      }
    }
  }
}
```

---

## GetRehabilitationOrder

**Hash**: `e793ce0f03e19a13fca0fb3db4457ffdbf7d267d6fc59e21692a2a443668b07b`
**Endpoint**: `/graphql`

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
        "getRehabilitationOrder": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "e6aaed10-1b94-4c82-841e-3ece6722b059"
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
            "orderStatus": {
              "type": "string",
              "sample": "ORDER_STATUS_ACTIVE"
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
                  "sample": 11
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
                  "sample": 7
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
                  "sample": 1768084385
                },
                "nanos": {
                  "type": "number",
                  "sample": 919332000
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
                  "sample": 1768200477
                },
                "nanos": {
                  "type": "number",
                  "sample": 881448000
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
                  "sample": "e6aaed10-1b94-4c82-841e-3ece6722b059"
                },
                "patientReceiptDiseaseUuid": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "type": "string",
                      "sample": "2ff59002-e942-4d5b-9000-870c5f12c295"
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
                      "sample": 2026
                    },
                    "month": {
                      "type": "number",
                      "sample": 1
                    },
                    "day": {
                      "type": "number",
                      "sample": 11
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
                      "sample": "2008e5c7-b596-4477-8ed6-aedcacc87d2d"
                    }
                  ]
                },
                "rehabilitationCalculationTypeUuid": {
                  "type": "object",
                  "properties": {
                    "value": {
                      "type": "string",
                      "sample": "d6ed2760-78e5-4d37-bb28-869080147eb3"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "StringValue"
                    }
                  }
                },
                "rehabilitationTherapyStartDateTypeUuid": {
                  "type": "null"
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
                      "sample": "2ff59002-e942-4d5b-9000-870c5f12c295"
                    },
                    "patientUuid": {
                      "type": "string",
                      "sample": "d0074cef-2938-4575-9e2b-96d2c2d8300c"
                    },
                    "masterDiseaseCode": {
                      "type": "string",
                      "sample": "8840829"
                    },
                    "masterModifierCodes": {
                      "type": "array",
                      "items": "empty"
                    },
                    "isMain": {
                      "type": "boolean",
                      "sample": false
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
                          "sample": 12
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
                    "masterDisease": {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "sample": "8840829"
                        },
                        "name": {
                          "type": "string",
                          "sample": "腰痛症"
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
                              "sample": "M5456"
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
                          "sample": "30cad7ab-a2c9-4450-90cb-c810e0991dcb"
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
                    "createTime": {
                      "type": "object",
                      "properties": {
                        "seconds": {
                          "type": "number",
                          "sample": 1765260110
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 983145000
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
                          "sample": 1765260110
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 983145000
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
                      "sample": "d6ed2760-78e5-4d37-bb28-869080147eb3"
                    },
                    "name": {
                      "type": "string",
                      "sample": "脳血管疾患等リハビリテーション"
                    },
                    "period": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "number",
                          "sample": 180
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
                      "length": 4,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "78482bdd-37a9-4bb4-a489-60ef0f8a90ff"
                            },
                            "name": {
                              "type": "string",
                              "sample": "発症日"
                            },
                            "rehabilitationCalculationTypeId": {
                              "type": "string",
                              "sample": "d6ed2760-78e5-4d37-bb28-869080147eb3"
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
                      "length": 3,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "510c3d5e-d08f-4e56-9872-2988cde8041d"
                            },
                            "rehabilitationCalculationTypeId": {
                              "type": "string",
                              "sample": "d6ed2760-78e5-4d37-bb28-869080147eb3"
                            },
                            "name": {
                              "type": "string",
                              "sample": "発症日"
                            },
                            "needsAcuteDiseaseName": {
                              "type": "boolean",
                              "sample": false
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
                          "sample": "2008e5c7-b596-4477-8ed6-aedcacc87d2d"
                        },
                        "category": {
                          "type": "string",
                          "sample": "PT"
                        },
                        "name": {
                          "type": "string",
                          "sample": "評価"
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

## GetSession

**Hash**: `7ffac1e2e9b56a996ded148a1d7ac6a65a0dfdc911f49348efa2a3386cae53d3`
**Endpoint**: `/graphql`

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
              "sample": "9408b544-d18b-49f5-ab96-89941d25548b"
            },
            "patientUuid": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
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
                  "sample": 1768021125
                },
                "nanos": {
                  "type": "number",
                  "sample": 600299000
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
                  "sample": 1768021104
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
                  "sample": 1768021125
                },
                "nanos": {
                  "type": "number",
                  "sample": 600299000
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
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
                  "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
                },
                "serialNumber": {
                  "type": "string",
                  "sample": "16581"
                },
                "serialNumberPrefix": {
                  "type": "string",
                  "sample": ""
                },
                "fullName": {
                  "type": "string",
                  "sample": "大平 逸郎"
                },
                "fullNamePhonetic": {
                  "type": "string",
                  "sample": "オオヒラ イツロウ"
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
                      "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
                    },
                    "addressLine_1": {
                      "type": "string",
                      "sample": "高松市 高松町78番地10プレジデント屋島304"
                    },
                    "addressLine_2": {
                      "type": "string",
                      "sample": ""
                    },
                    "postalCode": {
                      "type": "string",
                      "sample": "7610104"
                    },
                    "email": {
                      "type": "string",
                      "sample": ""
                    },
                    "phoneNumber": {
                      "type": "string",
                      "sample": "843-6172"
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
                          "sample": 1961
                        },
                        "month": {
                          "type": "number",
                          "sample": 4
                        },
                        "day": {
                          "type": "number",
                          "sample": 19
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Date"
                        }
                      }
                    },
                    "memo": {
                      "type": "string",
                      "sample": "TEL:09031830046\n 医療情報取得加算(再)07年12月\n一包化処方"
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
                  "sample": "e9504d33-4c9a-4175-a65f-1417b8f9a23d"
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

## GetSpecimenInspectionOrder

**Hash**: `160c39ecd493f1f27435b6fdd72c99f0dedfe29dc860c70f5869b6e5ae0c461f`
**Endpoint**: `/graphql`

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
        "getSpecimenInspectionOrder": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "64636fdd-3f5a-4a95-b246-9989a5517a93"
            },
            "patientUuid": {
              "type": "string",
              "sample": "cddebab0-1307-4de7-b62b-6e2a6aefaa8a"
            },
            "patient": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "cddebab0-1307-4de7-b62b-6e2a6aefaa8a"
                },
                "__typename": {
                  "type": "string",
                  "sample": "Patient"
                }
              }
            },
            "doctorUuid": {
              "type": "string",
              "sample": "5bbead66-558f-4382-a46d-140e9a304e4b"
            },
            "orderStatus": {
              "type": "string",
              "sample": "ORDER_STATUS_PREPARING"
            },
            "atLeastOneExecuted": {
              "type": "boolean",
              "sample": false
            },
            "inspectionDate": {
              "type": "null"
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
                  "sample": 1750986449
                },
                "nanos": {
                  "type": "number",
                  "sample": 140000000
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
                  "sample": 1750997571
                },
                "nanos": {
                  "type": "number",
                  "sample": 996747000
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "revokeDescription": {
              "type": "string",
              "sample": ""
            },
            "specimenInspectionOrderSpecimenInspections": {
              "type": "array",
              "length": 1,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "032cbce5-bd05-440f-a94d-4ebc6c7f1f8b"
                    },
                    "specimenInspectionUuid": {
                      "type": "string",
                      "sample": "840780c1-6817-49c0-b224-7e94dc60cdbd"
                    },
                    "specimenInspection": {
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
                    },
                    "consultationOutsideInspections": {
                      "type": "array",
                      "items": "empty"
                    },
                    "consultationDiagnoses": {
                      "type": "array",
                      "length": 2,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "fa5018fe-7155-4a67-9b40-f8f8ba4eb837"
                            },
                            "orderType": {
                              "type": "string",
                              "sample": "EXAMINATION"
                            },
                            "paramValue": {
                              "type": "null"
                            },
                            "isCalculatable": {
                              "type": "boolean",
                              "sample": true
                            },
                            "masterDiagnosis": {
                              "type": "object",
                              "properties": {
                                "code": {
                                  "type": "string",
                                  "sample": "160008010"
                                },
                                "name": {
                                  "type": "string",
                                  "sample": "末梢血液一般検査"
                                },
                                "unitCode": {
                                  "type": "number",
                                  "sample": 0
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
                                "isSpecimenComment": {
                                  "type": "boolean",
                                  "sample": false
                                },
                                "isSpecimenInspection": {
                                  "type": "boolean",
                                  "sample": true
                                },
                                "applicableConsultationTypeCodes": {
                                  "type": "array",
                                  "length": 1,
                                  "items": [
                                    {
                                      "type": "max_depth"
                                    }
                                  ]
                                },
                                "isDiminishing": {
                                  "type": "object",
                                  "properties": {
                                    "value": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "point": {
                                  "type": "object",
                                  "properties": {
                                    "value": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "pointType": {
                                  "type": "object",
                                  "properties": {
                                    "value": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "MasterDiagnosis"
                                }
                              }
                            },
                            "comments": {
                              "type": "array",
                              "items": "empty"
                            },
                            "bodyPartComments": {
                              "type": "array",
                              "items": "empty"
                            },
                            "specimenDiagnosis": {
                              "type": "null"
                            },
                            "isFeeForService": {
                              "type": "boolean",
                              "sample": false
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "ConsultationDiagnosis"
                            }
                          }
                        }
                      ]
                    },
                    "consultationMedicines": {
                      "type": "array",
                      "items": "empty"
                    },
                    "consultationEquipments": {
                      "type": "array",
                      "items": "empty"
                    },
                    "note": {
                      "type": "string",
                      "sample": ""
                    },
                    "urgency": {
                      "type": "boolean",
                      "sample": false
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "SpecimenInspectionOrder_SpecimenInspectionOrderSpe..."
                    }
                  }
                }
              ]
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
            "createUser": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "5182b5da-9394-4935-86fa-6cb402826a57"
                },
                "name": {
                  "type": "string",
                  "sample": "片山　優子"
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
                      "sample": "カタヤマ　ユウコ"
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
            "encounterId": {
              "type": "null"
            },
            "extendedInsuranceCombinationId": {
              "type": "null"
            },
            "sendInspectionRequest": {
              "type": "boolean",
              "sample": true
            },
            "hasUnrequestedChanges": {
              "type": "boolean",
              "sample": false
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
              "sample": "SpecimenInspectionOrder"
            }
          }
        }
      }
    }
  }
}
```

---

## ListActiveNursingPlans

**Hash**: `3e99b47f6558f69eba009b96ee4beff5797c8d0b6e420a3c4014b227dc4ed5ca`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "patientUuid": "string",
    "pageToken": "string",
    "pageSize": "number"
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
        "listActiveNursingPlans": {
          "type": "object",
          "properties": {
            "nursingPlans": {
              "type": "array",
              "length": 1,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "f049c684-d2b0-441a-a1c4-777ecc3b76a4"
                    },
                    "patientUuid": {
                      "type": "string",
                      "sample": "a581024d-2dd9-436e-a509-631953666664"
                    },
                    "nursingProblemUuid": {
                      "type": "string",
                      "sample": "3d1a841a-9bde-4724-a70a-63cd90c72c9c"
                    },
                    "createUserUuid": {
                      "type": "string",
                      "sample": "89b66b03-38f5-467d-aed3-1bf3455f59b2"
                    },
                    "updateUserUuid": {
                      "type": "string",
                      "sample": "89b66b03-38f5-467d-aed3-1bf3455f59b2"
                    },
                    "editorData": {
                      "type": "string",
                      "sample": "{\n  \"blocks\": [\n    {\n      \"key\": \"f9u17\",\n      ..."
                    },
                    "evaluationDate": {
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
                          "sample": 18
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
                          "sample": 1747569859
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 346883000
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
                          "sample": 1747569859
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 346883000
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Timestamp"
                        }
                      }
                    },
                    "endTime": {
                      "type": "null"
                    },
                    "endReason": {
                      "type": "null"
                    },
                    "nursingProblem": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "3d1a841a-9bde-4724-a70a-63cd90c72c9c"
                        },
                        "grandparentName": {
                          "type": "object",
                          "properties": {
                            "value": {
                              "type": "string",
                              "sample": "整形外科"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "StringValue"
                            }
                          }
                        },
                        "parentName": {
                          "type": "object",
                          "properties": {
                            "value": {
                              "type": "string",
                              "sample": "成人転倒転落リスク状態"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "StringValue"
                            }
                          }
                        },
                        "name": {
                          "type": "string",
                          "sample": "転倒転落の可能性がある"
                        },
                        "displayOrder": {
                          "type": "number",
                          "sample": 122
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "NursingProblem"
                        }
                      }
                    },
                    "createUser": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "89b66b03-38f5-467d-aed3-1bf3455f59b2"
                        },
                        "name": {
                          "type": "string",
                          "sample": "山下　陽子"
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
                              "sample": "ヤマシタ　ヨウコ"
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
                          "sample": "89b66b03-38f5-467d-aed3-1bf3455f59b2"
                        },
                        "name": {
                          "type": "string",
                          "sample": "山下　陽子"
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
                              "sample": "ヤマシタ　ヨウコ"
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
                      "sample": "NursingPlan"
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
              "sample": "ListActiveNursingPlansResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListAllPatientAttentions

**Hash**: `50572e45d6c3901321848be2600a135cf146efde4ad1d258f0ec724c627c49f2`
**Endpoint**: `/graphql`

### Variables

```json
{
  "infectionInput": {
    "patientUuid": "string",
    "pageSize": "number",
    "pageToken": "string"
  },
  "foodAllergyInput": {
    "patientUuid": "string",
    "pageSize": "number",
    "pageToken": "string"
  },
  "otherAllergyInput": {
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
        "listPatientInfectionAttentions": {
          "type": "object",
          "properties": {
            "attentions": {
              "type": "array",
              "items": "empty"
            },
            "nextPageToken": {
              "type": "string",
              "sample": ""
            },
            "__typename": {
              "type": "string",
              "sample": "ListPatientInfectionAttentionsResponse"
            }
          }
        },
        "listPatientFoodAllergyAttentions": {
          "type": "object",
          "properties": {
            "attentions": {
              "type": "array",
              "items": "empty"
            },
            "nextPageToken": {
              "type": "string",
              "sample": ""
            },
            "__typename": {
              "type": "string",
              "sample": "ListPatientFoodAllergyAttentionsResponse"
            }
          }
        },
        "listPatientOtherAllergyAttentions": {
          "type": "object",
          "properties": {
            "attentions": {
              "type": "array",
              "items": "empty"
            },
            "nextPageToken": {
              "type": "string",
              "sample": ""
            },
            "__typename": {
              "type": "string",
              "sample": "ListPatientOtherAllergyAttentionsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListAllPatientAttentionsV2

**Hash**: `04d2ee9ed03a528bbaebe1b29c99d6caf64adfc1aa3b81a6b60a64697ad5987f`
**Endpoint**: `/graphql-v2`

### Variables

```json
{
  "drugAllergyInput": {
    "patientId": "string",
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
        "patientDrugAllergyAttentionsV2": {
          "type": "object",
          "properties": {
            "attentions": {
              "type": "array",
              "items": "empty"
            },
            "nextPageToken": {
              "type": "null"
            },
            "__typename": {
              "type": "string",
              "sample": "PatientDrugAllergyAttentionsV2"
            }
          }
        }
      }
    }
  }
}
```

---

## ListAllRehabilitationCalculationTypes

**Hash**: `a6f720ce3344d22fa56fac71cead3b4b089ccb16ecf94d6886d179b4fb98b631`
**Endpoint**: `/graphql`

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
        "listAllRehabilitationCalculationTypes": {
          "type": "object",
          "properties": {
            "rehabilitationCalculationTypes": {
              "type": "array",
              "length": 11,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "07310d0c-a6b0-44d4-a21b-1fe905f16657"
                    },
                    "name": {
                      "type": "string",
                      "sample": "心大血管疾患リハビリテーション"
                    },
                    "period": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "number",
                          "sample": 150
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
                      "length": 1,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "69ec56b2-05c6-4e20-809a-38965e0919d9"
                            },
                            "name": {
                              "type": "string",
                              "sample": "治療開始日"
                            },
                            "rehabilitationCalculationTypeId": {
                              "type": "string",
                              "sample": "07310d0c-a6b0-44d4-a21b-1fe905f16657"
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
                              "sample": "988d9367-7d5c-45cf-89b0-83b0751b2e61"
                            },
                            "rehabilitationCalculationTypeId": {
                              "type": "string",
                              "sample": "07310d0c-a6b0-44d4-a21b-1fe905f16657"
                            },
                            "name": {
                              "type": "string",
                              "sample": "発症日"
                            },
                            "needsAcuteDiseaseName": {
                              "type": "boolean",
                              "sample": false
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
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListAllRehabilitationCalculationTypesResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListAvailablePatientInsuranceCombinations

**Hash**: `e9c53f39ead6f05bb3e9143b3e975ea6099ad9fa63adcce52dcc4211bd1a6f22`
**Endpoint**: `/graphql`

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
              "length": 2,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "09aec111-8e65-418b-a695-576249ef0f7e"
                    },
                    "healthInsuranceSystemUuid": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "string",
                          "sample": "d6a72f56-ad2b-404a-9435-b4b88d4c2353"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "StringValue"
                        }
                      }
                    },
                    "publicSubsidySystemUuid_1": {
                      "type": "null"
                    },
                    "publicSubsidySystemUuid_2": {
                      "type": "null"
                    },
                    "displayName": {
                      "type": "string",
                      "sample": "協会けんぽ"
                    },
                    "shortDisplayName": {
                      "type": "string",
                      "sample": "協会"
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

## ListBiopsyInspections

**Hash**: `b425f1d02cdba246a4caad5dbd062982bb6bd511f42b5f318c54c203b3ee4dd0`
**Endpoint**: `/graphql`

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
**Endpoint**: `/graphql`

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
        "listClinicalDocumentCustomTypes": {
          "type": "object",
          "properties": {
            "clinicalDocumentCustomTypes": {
              "type": "array",
              "length": 18,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "b9d02078-751e-4ec8-a17a-f31892997e88"
                    },
                    "name": {
                      "type": "string",
                      "sample": "入院臨時指示"
                    },
                    "excerptType": {
                      "type": "string",
                      "sample": "NONE"
                    },
                    "displayOrder": {
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
                    "isDeletable": {
                      "type": "boolean",
                      "sample": false
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "ClinicalDocumentCustomType"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListClinicalDocumentCustomTypesRequestResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListClinicalDocuments

**Hash**: `1c4cab71733c192c3143f4c25e6040eb6df6d87fc6cda513f6566a75da7d7df0`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "patientUuid": "string",
    "pageToken": "string",
    "pageSize": "number",
    "clinicalDocumentTypes": [
      {
        "type": "string"
      }
    ]
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
        "listClinicalDocuments": {
          "type": "object",
          "properties": {
            "documents": {
              "type": "array",
              "length": 50,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "dfae5d8b-b3c2-4e25-b57d-902d81f84108"
                    },
                    "hospitalizationUuid": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "string",
                          "sample": "8e64c8dd-1c92-4a76-8a9d-38e043f5b148"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "StringValue"
                        }
                      }
                    },
                    "patientUuid": {
                      "type": "string",
                      "sample": "adfa5a4a-e8cb-430e-b9f3-4d534d230c6b"
                    },
                    "creatorUuid": {
                      "type": "string",
                      "sample": "5bbead66-558f-4382-a46d-140e9a304e4b"
                    },
                    "lastAuthorUuid": {
                      "type": "string",
                      "sample": "5bbead66-558f-4382-a46d-140e9a304e4b"
                    },
                    "editorData": {
                      "type": "string",
                      "sample": "{\n  \"blocks\": [\n    {\n      \"key\": \"e6mj0\",\n      ..."
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
                          "sample": 1767925800
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
                          "sample": 1767925856
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 390918000
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
                          "sample": 1767925856
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 390918000
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
                          "sample": "adfa5a4a-e8cb-430e-b9f3-4d534d230c6b"
                        },
                        "serialNumber": {
                          "type": "string",
                          "sample": "18715"
                        },
                        "serialNumberPrefix": {
                          "type": "string",
                          "sample": ""
                        },
                        "fullName": {
                          "type": "string",
                          "sample": "中西 孝子"
                        },
                        "fullNamePhonetic": {
                          "type": "string",
                          "sample": "ナカニシ タカコ"
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
                              "sample": "adfa5a4a-e8cb-430e-b9f3-4d534d230c6b"
                            },
                            "addressLine_1": {
                              "type": "string",
                              "sample": "高松市香川町浅野3603-6"
                            },
                            "addressLine_2": {
                              "type": "string",
                              "sample": ""
                            },
                            "postalCode": {
                              "type": "string",
                              "sample": "761-1703"
                            },
                            "email": {
                              "type": "string",
                              "sample": ""
                            },
                            "phoneNumber": {
                              "type": "string",
                              "sample": "08039208431"
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
                                  "sample": 1943
                                },
                                "month": {
                                  "type": "number",
                                  "sample": 3
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
                            "memo": {
                              "type": "string",
                              "sample": "高額療養7年7月 7年10月"
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
                    "lastAuthor": {
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
                    "creator": {
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
                      "sample": "ClinicalDocument"
                    }
                  }
                }
              ]
            },
            "nextPageToken": {
              "type": "string",
              "sample": "50"
            },
            "__typename": {
              "type": "string",
              "sample": "ListClinicalDocumentsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListClinicalDocumentTemplates

**Hash**: `9484d1daec71d152c1ecc4fe0400fb2440b37236ee1117951f0b32310a408653`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "query": "string",
    "filterTypes": [
      "string"
    ]
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
        "listClinicalDocumentTemplates": {
          "type": "object",
          "properties": {
            "clinicalDocumentTemplates": {
              "type": "array",
              "length": 68,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "7c4e307c-a02c-4c0d-bcd3-f002263d6ae0"
                    },
                    "title": {
                      "type": "string",
                      "sample": "デルマトーム"
                    },
                    "description": {
                      "type": "string",
                      "sample": ""
                    },
                    "editorData": {
                      "type": "string",
                      "sample": "{\n  \"blocks\": [\n    {\n      \"key\": \"1n816\",\n      ..."
                    },
                    "clinicalDocumentType": {
                      "type": "string",
                      "sample": "HOSPITALIZATION_CONSULTATION"
                    },
                    "clinicalDocumentCustomTypeUuid": {
                      "type": "null"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "ClinicalDocumentTemplate"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListClinicalDocumentTemplatesResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListClinicalQuantitativeDataDefs

**Hash**: `f64f425eb240e7d3cceba86e42188e6c502503e4fbec9072723bd2b55591f957`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
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
        "listClinicalQuantitativeDataDefs": {
          "type": "object",
          "properties": {
            "clinicalQuantitativeDataDefs": {
              "type": "array",
              "length": 21,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "f20a5f9d-e40d-4049-a24b-a5e5809dc7e8"
                    },
                    "name": {
                      "type": "string",
                      "sample": "救護区分"
                    },
                    "obsoleteTime": {
                      "type": "null"
                    },
                    "options": {
                      "type": "array",
                      "length": 4,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "0084d0a9-fcb7-43f8-9d68-e8ba56b1dd36"
                            },
                            "label": {
                              "type": "string",
                              "sample": "独歩"
                            },
                            "value": {
                              "type": "object",
                              "properties": {
                                "type": {
                                  "type": "string",
                                  "sample": "IMMEDIATE_VALUE_TYPE_STRING"
                                },
                                "numericValue": {
                                  "type": "null"
                                },
                                "string": {
                                  "type": "object",
                                  "properties": {
                                    "value": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "datetime": {
                                  "type": "null"
                                },
                                "date": {
                                  "type": "null"
                                },
                                "time": {
                                  "type": "null"
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "ImmediateValue"
                                }
                              }
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "ClinicalQuantitativeDataDef_Option"
                            }
                          }
                        }
                      ]
                    },
                    "valueGroups": {
                      "type": "array",
                      "length": 1,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "71fb3c53-d387-4726-ab58-a7dd5fec22bf"
                            },
                            "aggregationMethod": {
                              "type": "string",
                              "sample": "SUM"
                            },
                            "refType": {
                              "type": "string",
                              "sample": "OPTION"
                            },
                            "refUuids": {
                              "type": "array",
                              "length": 4,
                              "items": [
                                {
                                  "type": "string",
                                  "sample": "326625e7-026a-4f1d-8e7c-584ea7b46299"
                                }
                              ]
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "ClinicalQuantitativeDataDef_ValueGroup"
                            }
                          }
                        }
                      ]
                    },
                    "entries": {
                      "type": "array",
                      "length": 1,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "f8494f8c-cbc0-4e85-980c-fa89285832d7"
                            },
                            "name": {
                              "type": "string",
                              "sample": "救護区分"
                            },
                            "description": {
                              "type": "object",
                              "properties": {
                                "value": {
                                  "type": "string",
                                  "sample": ""
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "StringValue"
                                }
                              }
                            },
                            "unit": {
                              "type": "object",
                              "properties": {
                                "value": {
                                  "type": "string",
                                  "sample": ""
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "StringValue"
                                }
                              }
                            },
                            "isPersonalizable": {
                              "type": "boolean",
                              "sample": false
                            },
                            "entryType": {
                              "type": "string",
                              "sample": "SELECT_MULTIPLE"
                            },
                            "entry": {
                              "type": "object",
                              "properties": {
                                "immediateEntry": {
                                  "type": "null"
                                },
                                "selectBoolEntry": {
                                  "type": "null"
                                },
                                "selectSingleEntry": {
                                  "type": "null"
                                },
                                "selectMultipleEntry": {
                                  "type": "object",
                                  "properties": {
                                    "valueGroupUuid": {
                                      "type": "max_depth"
                                    },
                                    "required": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "uploadFileEntry": {
                                  "type": "null"
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "ClinicalQuantitativeDataDef_EntryDef_entry"
                                }
                              }
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "ClinicalQuantitativeDataDef_EntryDef"
                            }
                          }
                        }
                      ]
                    },
                    "sections": {
                      "type": "array",
                      "length": 1,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "title": {
                              "type": "object",
                              "properties": {
                                "value": {
                                  "type": "string",
                                  "sample": "救護区分"
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "StringValue"
                                }
                              }
                            },
                            "level": {
                              "type": "string",
                              "sample": "ONE"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "ClinicalQuantitativeDataDef_Section"
                            },
                            "children": {
                              "type": "array",
                              "length": 1,
                              "items": [
                                {
                                  "type": "object",
                                  "properties": {
                                    "value": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                }
                              ]
                            }
                          }
                        }
                      ]
                    },
                    "personalizableInputEntrySections": {
                      "type": "array",
                      "items": "empty"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "ClinicalQuantitativeDataDef"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListClinicalQuantitativeDataDefsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListDailyWardHospitalizations

**Hash**: `e1692624de62dd647f1e30bbeb9d468a67b777510710c474fb99f9a5b52ee02f`
**Endpoint**: `/graphql`

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
              "items": "empty"
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
**Endpoint**: `/graphql`

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
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "searchDate": {
      "year": "number",
      "month": "number",
      "day": "number"
    },
    "searchDateFilterType": "string",
    "codes": [
      "string"
    ]
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
        "listDiagnoses": {
          "type": "object",
          "properties": {
            "diagnoses": {
              "type": "array",
              "length": 2,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "code": {
                      "type": "string",
                      "sample": "160008010"
                    },
                    "name": {
                      "type": "string",
                      "sample": "末梢血液一般検査"
                    },
                    "unitCode": {
                      "type": "number",
                      "sample": 0
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
                    "isSpecimenComment": {
                      "type": "boolean",
                      "sample": false
                    },
                    "isSpecimenInspection": {
                      "type": "boolean",
                      "sample": true
                    },
                    "applicableConsultationTypeCodes": {
                      "type": "array",
                      "length": 1,
                      "items": [
                        {
                          "type": "string",
                          "sample": "60"
                        }
                      ]
                    },
                    "isDiminishing": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "boolean",
                          "sample": false
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "BoolValue"
                        }
                      }
                    },
                    "point": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "number",
                          "sample": 2100
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Frac100"
                        }
                      }
                    },
                    "pointType": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "number",
                          "sample": 3
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "UInt32Value"
                        }
                      }
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "MasterDiagnosis"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListDiagnosesResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListFeatureFlags

**Hash**: `d5dbed7ecdce3c810e4c9a7a17b690aefa40cf9b29e078ad991318a2787c3091`
**Endpoint**: `/graphql-v2`

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
        "listFeatureFlags": {
          "type": "object",
          "properties": {
            "definitions": {
              "type": "array",
              "length": 51,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "id": {
                      "type": "string",
                      "sample": "tmp20240716DataTabV2"
                    },
                    "defaultValue": {
                      "type": "number",
                      "sample": 0
                    },
                    "editableByUser": {
                      "type": "boolean",
                      "sample": true
                    },
                    "displayName": {
                      "type": "string",
                      "sample": "データタブ V2"
                    },
                    "description": {
                      "type": "string",
                      "sample": ""
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "FeatureFlagDefinition"
                    }
                  }
                }
              ]
            },
            "values": {
              "type": "array",
              "length": 13,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "featureFlagDefinitionId": {
                      "type": "string",
                      "sample": "tmp20240716DataTabV2"
                    },
                    "value": {
                      "type": "number",
                      "sample": 1
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "FeatureFlagConfiguration"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListFeatureFlagsResponse"
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
**Endpoint**: `/graphql`

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
              "length": 2,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "656e169b-4902-444f-a6cb-837a9c2508da"
                    },
                    "hospitalizationUuid": {
                      "type": "string",
                      "sample": "0ff21f3d-fa87-4270-baf4-00af65386afa"
                    },
                    "departmentUuid": {
                      "type": "string",
                      "sample": "bc182da1-b2b0-4645-873a-1932eeccdb97"
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
                          "sample": 2
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
**Endpoint**: `/graphql`

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
              "length": 2,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "a2a71c61-d4ba-4df1-884b-a87db2153a61"
                    },
                    "hospitalizationUuid": {
                      "type": "string",
                      "sample": "0ff21f3d-fa87-4270-baf4-00af65386afa"
                    },
                    "doctorUuid": {
                      "type": "string",
                      "sample": "c787d4dc-6fb5-4c38-87d2-31c9afe5a2b3"
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
                          "sample": 2
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
                          "sample": "c787d4dc-6fb5-4c38-87d2-31c9afe5a2b3"
                        },
                        "name": {
                          "type": "string",
                          "sample": "依田　健志"
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
                              "sample": "ヨダ　タケシ"
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
**Endpoint**: `/graphql`

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
              "length": 2,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "71cc5eb5-57c7-4bc0-a26c-95cdc47fb785"
                    },
                    "hospitalizationUuid": {
                      "type": "string",
                      "sample": "0ff21f3d-fa87-4270-baf4-00af65386afa"
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
                          "sample": "47d45d67-d317-42b5-b524-939f9b344d7c"
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
                          "sample": 2025
                        },
                        "month": {
                          "type": "number",
                          "sample": 12
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
                    "transferTime": {
                      "type": "object",
                      "properties": {
                        "hours": {
                          "type": "number",
                          "sample": 16
                        },
                        "minutes": {
                          "type": "number",
                          "sample": 54
                        },
                        "seconds": {
                          "type": "number",
                          "sample": 13
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
                          "sample": "47d45d67-d317-42b5-b524-939f9b344d7c"
                        },
                        "wardUuid": {
                          "type": "string",
                          "sample": "e7c51602-9d76-4800-a2ee-02b5d50d51fd"
                        },
                        "name": {
                          "type": "string",
                          "sample": "451"
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
                      "sample": true
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
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "imagingOrderUuid": "string",
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
        "listImagingOrderHistories": {
          "type": "object",
          "properties": {
            "imagingOrderHistories": {
              "type": "array",
              "length": 1,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "086fe1f9-3a4f-43ef-9994-38a1184368db"
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
                          "sample": 11
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
                          "sample": 1768084274
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 920813000
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
                          "sample": 1768084293
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 538679000
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
                          "sample": "086fe1f9-3a4f-43ef-9994-38a1184368db"
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
                                      "type": "max_depth"
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
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "string",
                          "sample": "f956ac69-f9f5-4521-8d8b-b360e52ccfa8"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "StringValue"
                        }
                      }
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
                      "sample": true
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "ImagingOrder"
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
              "sample": "ListImagingOrderHistoriesResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListLastApprovedPrescriptionOrderHistories

**Hash**: `6dfdac6bafb22665dcb7bc584b45da378341f9c98df371f0d2026f3723913125`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "prescriptionOrderUuids": [
      "string"
    ]
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
        "listLastApprovedPrescriptionOrderHistories": {
          "type": "object",
          "properties": {
            "lastApprovedPrescriptionOrderHistories": {
              "type": "array",
              "items": "empty"
            },
            "__typename": {
              "type": "string",
              "sample": "ListLastApprovedPrescriptionOrderHistoriesResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListLatestFinalizedImagingOrderHistories

**Hash**: `2ba912950899a0770635719bdd64c8c0bbda9153f0d09534a10c0c10b09553a0`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "imagingOrderUuids": [
      "string"
    ]
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
        "listLatestFinalizedImagingOrderHistories": {
          "type": "object",
          "properties": {
            "latestFinalizedImagingOrderHistories": {
              "type": "array",
              "items": "empty"
            },
            "__typename": {
              "type": "string",
              "sample": "ListLatestFinalizedImagingOrderHistoriesResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListLatestFinalizedSpecimenInspectionOrderHistories

**Hash**: `86aaa4eaaaf226a2401a1e5bfdd288b3af6654b05c7584d94cef5ef212664810`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "specimenInspectionOrderUuids": [
      "string"
    ]
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
        "listLatestFinalizedSpecimenInspectionOrderHistories": {
          "type": "object",
          "properties": {
            "latestFinalizedSpecimenInspectionOrderHistories": {
              "type": "array",
              "items": "empty"
            },
            "__typename": {
              "type": "string",
              "sample": "ListLatestFinalizedSpecimenInspectionOrderHistorie..."
            }
          }
        }
      }
    }
  }
}
```

---

## ListLaunchIntegrations

**Hash**: `96e346597610d4564f4d3180aa73fc539356b086c58bb7176dc29a1d4b1b025a`
**Endpoint**: `/graphql`

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
        "listLaunchIntegrations": {
          "type": "object",
          "properties": {
            "launchIntegrations": {
              "type": "array",
              "items": "empty"
            },
            "__typename": {
              "type": "string",
              "sample": "ListLaunchIntegrationsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListLocalBodySites

**Hash**: `f043c32ee6d1ab6b298ec79ea6644025092936ce4d2c337cfd30c30a2c398e96`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
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
        "listLocalBodySites": {
          "type": "object",
          "properties": {
            "bodySites": {
              "type": "array",
              "length": 63,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "85c436f8-fdb5-40d5-9cc2-ca3c55562b94"
                    },
                    "name": {
                      "type": "string",
                      "sample": "胸部"
                    },
                    "lateralityRequirement": {
                      "type": "boolean",
                      "sample": true
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "LocalBodySite"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListLocalBodySitesResponse"
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
**Endpoint**: `/graphql`

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
              "length": 429,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "receiptUnitKeyHash": {
                      "type": "string",
                      "sample": "90d0bcc7c2bf1e72df6d269f41aeff00a0dece97f9d49d2121..."
                    },
                    "patientUuid": {
                      "type": "string",
                      "sample": "d774d538-de9f-40a3-9a8c-4f9b8f6f4cdb"
                    },
                    "patientHealthInsuranceUuid": {
                      "type": "null"
                    },
                    "patientPublicSubsidyUuids": {
                      "type": "array",
                      "length": 1,
                      "items": [
                        {
                          "type": "string",
                          "sample": "e3d183ec-7cdc-4cbe-832c-ff8ca28e508e"
                        }
                      ]
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
                          "sample": 11
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "YearMonth"
                        }
                      }
                    },
                    "isHospitalization": {
                      "type": "boolean",
                      "sample": true
                    },
                    "invoiceStatus": {
                      "type": "string",
                      "sample": "ON_HOLD"
                    },
                    "holdReleaseYearMonth": {
                      "type": "null"
                    },
                    "patient": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "d774d538-de9f-40a3-9a8c-4f9b8f6f4cdb"
                        },
                        "serialNumber": {
                          "type": "string",
                          "sample": "19849"
                        },
                        "serialNumberPrefix": {
                          "type": "string",
                          "sample": ""
                        },
                        "fullName": {
                          "type": "string",
                          "sample": "安部 道子"
                        },
                        "fullNamePhonetic": {
                          "type": "string",
                          "sample": "アベ ミチコ"
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
                              "sample": "d774d538-de9f-40a3-9a8c-4f9b8f6f4cdb"
                            },
                            "addressLine_1": {
                              "type": "string",
                              "sample": "高松市花園町1丁目1－5"
                            },
                            "addressLine_2": {
                              "type": "string",
                              "sample": "グループリビングらく楽花園"
                            },
                            "postalCode": {
                              "type": "string",
                              "sample": "7600072"
                            },
                            "email": {
                              "type": "string",
                              "sample": ""
                            },
                            "phoneNumber": {
                              "type": "string",
                              "sample": "832-0111"
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
                                  "sample": 1950
                                },
                                "month": {
                                  "type": "number",
                                  "sample": 1
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
                              "sample": "心臓マッサージ希望\n金属アレルギー"
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
                              "sample": "担送"
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
                    "insuranceCombinationDescription": {
                      "type": "string",
                      "sample": "生活保護・負担有・入外通算なし"
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
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "patientUuid": "string",
    "pageSize": "number",
    "pageToken": "string",
    "parentFileFolderUuid": "null"
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
        "listNonEmptyPatientFileFoldersOfPatient": {
          "type": "object",
          "properties": {
            "patientFileFolders": {
              "type": "array",
              "length": 1,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "70fefec6-3492-4ad4-af57-6d63dfef34f1"
                    },
                    "name": {
                      "type": "string",
                      "sample": "看護"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "PatientFileFolder"
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
              "sample": "ListNonEmptyPatientFileFoldersOfPatientResponse"
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

**Hash**: `dac9815510d818e7343e4d9704e62e30256137246014a6b30d2bd1bdee8820be`
**Endpoint**: `/graphql`

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
              "length": 4,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "patient": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "2c5c703b-e689-47ac-979e-4e8ebd698b16"
                        },
                        "serialNumber": {
                          "type": "string",
                          "sample": "03926"
                        },
                        "serialNumberPrefix": {
                          "type": "string",
                          "sample": ""
                        },
                        "fullName": {
                          "type": "string",
                          "sample": "川崎 幸子"
                        },
                        "fullNamePhonetic": {
                          "type": "string",
                          "sample": "カワサキ サチコ"
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
                              "sample": "2c5c703b-e689-47ac-979e-4e8ebd698b16"
                            },
                            "addressLine_1": {
                              "type": "string",
                              "sample": "高松市川部町1613-1"
                            },
                            "addressLine_2": {
                              "type": "string",
                              "sample": ""
                            },
                            "postalCode": {
                              "type": "string",
                              "sample": "761-8046"
                            },
                            "email": {
                              "type": "string",
                              "sample": ""
                            },
                            "phoneNumber": {
                              "type": "string",
                              "sample": "886-4332"
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
                                  "sample": 1936
                                },
                                "month": {
                                  "type": "number",
                                  "sample": 6
                                },
                                "day": {
                                  "type": "number",
                                  "sample": 25
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "Date"
                                }
                              }
                            },
                            "memo": {
                              "type": "string",
                              "sample": "TEL:08031639438\n処方箋FAX：すずらん          医療情報取得加算(再)07..."
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "PatientDetail"
                            }
                          }
                        },
                        "tags": {
                          "type": "array",
                          "length": 1,
                          "items": [
                            {
                              "type": "string",
                              "sample": "PT三井"
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
                      "length": 1,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "bb7ba9f4-d685-453c-86d0-ff9858ca0824"
                            },
                            "orderType": {
                              "type": "string",
                              "sample": "ORDER_TYPE_ACCOUNTING"
                            },
                            "order": {
                              "type": "object",
                              "properties": {
                                "uuid": {
                                  "type": "string",
                                  "sample": "bb7ba9f4-d685-453c-86d0-ff9858ca0824"
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
                                  "type": "null"
                                },
                                "injectionOrderV2": {
                                  "type": "null"
                                },
                                "accountingOrder": {
                                  "type": "object",
                                  "properties": {
                                    "uuid": {
                                      "type": "max_depth"
                                    },
                                    "patient": {
                                      "type": "max_depth"
                                    },
                                    "doctor": {
                                      "type": "max_depth"
                                    },
                                    "performDate": {
                                      "type": "max_depth"
                                    },
                                    "orderStatus": {
                                      "type": "max_depth"
                                    },
                                    "revokeDescription": {
                                      "type": "max_depth"
                                    },
                                    "accountingInstructionGroups": {
                                      "type": "max_depth"
                                    },
                                    "createUser": {
                                      "type": "max_depth"
                                    },
                                    "updateUser": {
                                      "type": "max_depth"
                                    },
                                    "createTime": {
                                      "type": "max_depth"
                                    },
                                    "updateTime": {
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
**Endpoint**: `/graphql`

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

## ListOrders

**Hash**: `bb3684f37ab0c02d11af5497c20a1d0783105e8a57de28e0bb197bad45af7bdc`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "patientUuid": "string",
    "filterOrderStatus": [
      "string"
    ],
    "patientCareType": "string",
    "filterOrderTypes": [
      "string"
    ]
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
        "listOrders": {
          "type": "object",
          "properties": {
            "orders": {
              "type": "array",
              "length": 2,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "2633756a-96d4-4e7f-a663-91ebe3e351ed"
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
                          "sample": "2633756a-96d4-4e7f-a663-91ebe3e351ed"
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
                              "type": "string",
                              "sample": "2633756a-96d4-4e7f-a663-91ebe3e351ed"
                            },
                            "patientUuid": {
                              "type": "string",
                              "sample": "a581024d-2dd9-436e-a509-631953666664"
                            },
                            "patient": {
                              "type": "object",
                              "properties": {
                                "uuid": {
                                  "type": "string",
                                  "sample": "a581024d-2dd9-436e-a509-631953666664"
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "Patient"
                                }
                              }
                            },
                            "doctorUuid": {
                              "type": "string",
                              "sample": "5bbead66-558f-4382-a46d-140e9a304e4b"
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
                                  "sample": 11
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
                            "endDate": {
                              "type": "object",
                              "properties": {
                                "year": {
                                  "type": "number",
                                  "sample": 2026
                                },
                                "month": {
                                  "type": "number",
                                  "sample": 3
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
                                  "sample": 1762039407
                                },
                                "nanos": {
                                  "type": "number",
                                  "sample": 987757000
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
                                  "sample": 1763110955
                                },
                                "nanos": {
                                  "type": "number",
                                  "sample": 461584000
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
                                  "sample": "2633756a-96d4-4e7f-a663-91ebe3e351ed"
                                },
                                "patientReceiptDiseaseUuid": {
                                  "type": "object",
                                  "properties": {
                                    "value": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "therapyStartDate": {
                                  "type": "object",
                                  "properties": {
                                    "year": {
                                      "type": "max_depth"
                                    },
                                    "month": {
                                      "type": "max_depth"
                                    },
                                    "day": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
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
                                  "length": 16,
                                  "items": [
                                    {
                                      "type": "max_depth"
                                    }
                                  ]
                                },
                                "rehabilitationCalculationTypeUuid": {
                                  "type": "object",
                                  "properties": {
                                    "value": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "rehabilitationTherapyStartDateTypeUuid": {
                                  "type": "object",
                                  "properties": {
                                    "value": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
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
                                      "type": "max_depth"
                                    },
                                    "patientUuid": {
                                      "type": "max_depth"
                                    },
                                    "masterDiseaseCode": {
                                      "type": "max_depth"
                                    },
                                    "masterModifierCodes": {
                                      "type": "max_depth"
                                    },
                                    "isMain": {
                                      "type": "max_depth"
                                    },
                                    "isSuspected": {
                                      "type": "max_depth"
                                    },
                                    "excludeReceipt": {
                                      "type": "max_depth"
                                    },
                                    "outcome": {
                                      "type": "max_depth"
                                    },
                                    "startDate": {
                                      "type": "max_depth"
                                    },
                                    "endDate": {
                                      "type": "max_depth"
                                    },
                                    "masterDisease": {
                                      "type": "max_depth"
                                    },
                                    "masterModifiers": {
                                      "type": "max_depth"
                                    },
                                    "customDiseaseName": {
                                      "type": "max_depth"
                                    },
                                    "intractableDiseaseType": {
                                      "type": "max_depth"
                                    },
                                    "patientCareType": {
                                      "type": "max_depth"
                                    },
                                    "isDraft": {
                                      "type": "max_depth"
                                    },
                                    "updateUser": {
                                      "type": "max_depth"
                                    },
                                    "createTime": {
                                      "type": "max_depth"
                                    },
                                    "updateTime": {
                                      "type": "max_depth"
                                    },
                                    "deleteTime": {
                                      "type": "max_depth"
                                    },
                                    "patient": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
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
                                      "type": "max_depth"
                                    },
                                    "name": {
                                      "type": "max_depth"
                                    },
                                    "period": {
                                      "type": "max_depth"
                                    },
                                    "isShikkanbetsuRehabilitation": {
                                      "type": "max_depth"
                                    },
                                    "therapyStartDateTypes": {
                                      "type": "max_depth"
                                    },
                                    "rehabilitationKasanStartDateTypes": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "rehabilitationPlans": {
                                  "type": "array",
                                  "length": 16,
                                  "items": [
                                    {
                                      "type": "max_depth"
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
                              "sample": true
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
                                      "type": "max_depth"
                                    },
                                    "value": {
                                      "type": "max_depth"
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
                                      "type": "max_depth"
                                    },
                                    "value": {
                                      "type": "max_depth"
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
                                  "sample": "fb87c42d-9908-47c4-be63-fc708c352fe8"
                                },
                                "name": {
                                  "type": "string",
                                  "sample": "三井　大輝"
                                },
                                "namePhonetic": {
                                  "type": "object",
                                  "properties": {
                                    "__typename": {
                                      "type": "max_depth"
                                    },
                                    "value": {
                                      "type": "max_depth"
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
                              "sample": false
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "RehabilitationOrder"
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
            "__typename": {
              "type": "string",
              "sample": "ListOrdersResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListOrganizationClinicalRecordViewFilters

**Hash**: `c4c28fa05f4d78bda4eb2a3bd2736b1a1d55f655a06ef396f39a0736c5f10086`
**Endpoint**: `/graphql`

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
        "listOrganizationClinicalRecordViewFilters": {
          "type": "object",
          "properties": {
            "organizationClinicalRecordViewFilters": {
              "type": "array",
              "length": 8,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "b4e9633e-f05b-4ba9-9f87-7defcbd8a283"
                    },
                    "title": {
                      "type": "string",
                      "sample": "病棟看護"
                    },
                    "filterClinicalResourceHrns": {
                      "type": "array",
                      "length": 28,
                      "items": [
                        {
                          "type": "string",
                          "sample": "//henry-app.jp/clinicalResource/vitalSign"
                        }
                      ]
                    },
                    "filterCreateUserUuids": {
                      "type": "array",
                      "items": "empty"
                    },
                    "filterAccountingOrderShinryoShikibetsus": {
                      "type": "array",
                      "items": "empty"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "OrganizationClinicalRecordViewFilter"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListOrganizationClinicalRecordViewFiltersResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListOrganizationImagingModalities

**Hash**: `cb51cef04e5fe354b5bf81c680fa41c7421f9c7dc54de6f69ae0489cc5434c76`
**Endpoint**: `/graphql`

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
        "listOrganizationImagingModalities": {
          "type": "object",
          "properties": {
            "organizationImagingModalities": {
              "type": "array",
              "length": 4,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "c94f0f86-4964-462d-9a07-7e5daed9e113"
                    },
                    "imagingModality": {
                      "type": "string",
                      "sample": "IMAGING_MODALITY_PLAIN_RADIOGRAPHY_DIGITAL"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "OrganizationImagingModality"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListOrganizationImagingModalitiesResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListOrganizationInstitutionStandards

**Hash**: `2ce0e0d80c7b78b9321b9b7083b247363ce98f30475e9db08af48c861847bbaa`
**Endpoint**: `/graphql`

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
        "listOrganizationInstitutionStandards": {
          "type": "object",
          "properties": {
            "institutionStandards": {
              "type": "array",
              "length": 30,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "8250df08-f8ce-4405-8ec8-0266d9679157"
                    },
                    "masterInstitutionStandardCode": {
                      "type": "string",
                      "sample": "22"
                    },
                    "masterInstitutionStandardName": {
                      "type": "string",
                      "sample": "開放型病院共同指導料"
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
                    "__typename": {
                      "type": "string",
                      "sample": "OrganizationInstitutionStandard"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListOrganizationInstitutionStandardsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListOrganizationMemberships

**Hash**: `10f8a904305fdceffa5f31a1e7d6331d5d50752889c74b9027f50c0c524ce5e6`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
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
        "listOrganizationMemberships": {
          "type": "object",
          "properties": {
            "organizationMemberships": {
              "type": "array",
              "length": 103,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "organizationUuid": {
                      "type": "string",
                      "sample": "ce6b556b-2a8d-4fce-b8dd-89ba638fc825"
                    },
                    "userUuid": {
                      "type": "string",
                      "sample": "2fbef2da-8d6b-416a-8773-b457aa693652"
                    },
                    "role": {
                      "type": "string",
                      "sample": "DOCTOR"
                    },
                    "departmentName": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "string",
                          "sample": "内科"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "StringValue"
                        }
                      }
                    },
                    "narcoticsLicenseNumber": {
                      "type": "null"
                    },
                    "isPsychiatrist": {
                      "type": "boolean",
                      "sample": false
                    },
                    "hasPrescriptionAudit": {
                      "type": "boolean",
                      "sample": false
                    },
                    "organization": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "ce6b556b-2a8d-4fce-b8dd-89ba638fc825"
                        },
                        "name": {
                          "type": "string",
                          "sample": "医療法人社団弘徳会 マオカ病院"
                        },
                        "displayName": {
                          "type": "string",
                          "sample": "医社）弘徳会マオカ病院"
                        },
                        "institutionCode": {
                          "type": "string",
                          "sample": "0118153"
                        },
                        "sskRegisteredName": {
                          "type": "string",
                          "sample": "医社）弘徳会マオカ病院"
                        },
                        "founderName": {
                          "type": "string",
                          "sample": "宇都宮　栄"
                        },
                        "detail": {
                          "type": "object",
                          "properties": {
                            "organizationUuid": {
                              "type": "string",
                              "sample": "ce6b556b-2a8d-4fce-b8dd-89ba638fc825"
                            },
                            "addressLine": {
                              "type": "string",
                              "sample": "香川県高松市瓦町一丁目１２番地４５"
                            },
                            "prefectureCode": {
                              "type": "string",
                              "sample": "37"
                            },
                            "bedCount": {
                              "type": "number",
                              "sample": 58
                            },
                            "defaultPrescriptionSystem": {
                              "type": "string",
                              "sample": "PRESCRIPTION_SYSTEM_OUT_SOURCED"
                            },
                            "phoneNumber": {
                              "type": "string",
                              "sample": "087-862-8888"
                            },
                            "qualifiedInvoiceIssuerNumber": {
                              "type": "string",
                              "sample": ""
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "OrganizationDetail"
                            }
                          }
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Organization"
                        }
                      }
                    },
                    "user": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "2fbef2da-8d6b-416a-8773-b457aa693652"
                        },
                        "name": {
                          "type": "string",
                          "sample": "操作　医師"
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
                              "sample": "ソウサ　テスト"
                            }
                          }
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "User"
                        }
                      }
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
                          "sample": "Int32Value"
                        }
                      }
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "OrganizationMembership"
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
              "sample": "ListOrganizationMembershipsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListPatientContacts

**Hash**: `d7c118d3803ed3fb5faa1a175cc44b7af91f16f6cc18da87435c55f7c838e629`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
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
        "listPatientContacts": {
          "type": "object",
          "properties": {
            "patientContacts": {
              "type": "array",
              "items": "empty"
            },
            "__typename": {
              "type": "string",
              "sample": "ListPatientContactsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListPatientDocumentTemplates

**Hash**: `4d1e4b03508c6e65a316b200a079295adb3ad5782c93f98f8727afec01898f3b`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "departmentCode": "null"
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
        "listPatientDocumentTemplates": {
          "type": "object",
          "properties": {
            "patientDocumentTemplates": {
              "type": "array",
              "length": 78,
              "items": [
                {
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
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListPatientDocumentTemplateResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListPatientFileFolders

**Hash**: `e5b8237f63c2fa1d4df28a900bdc151c395b040ea43415f94d511bf4a77bafb7`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "pageSize": "number",
    "pageToken": "string",
    "parentFileFolderUuid": "null"
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
        "listPatientFileFolders": {
          "type": "object",
          "properties": {
            "patientFileFolders": {
              "type": "array",
              "length": 31,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "a70412fe-3e6b-42a8-9d27-2fa1f3e49349"
                    },
                    "name": {
                      "type": "string",
                      "sample": "2025年入院書類(６月）"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "PatientFileFolder"
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
              "sample": "ListPatientFileFoldersResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListPatientFiles

**Hash**: `9b6c9015e5cd08ba2e93ec2eded98418415667bb849bfac9f75babb26fc95687`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "patientUuid": "string",
    "parentFileFolderUuid": "null",
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
        "listPatientFiles": {
          "type": "object",
          "properties": {
            "patientFiles": {
              "type": "array",
              "length": 100,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "79fc5654-66a2-4fd5-8043-e4f770348e80"
                    },
                    "createTime": {
                      "type": "object",
                      "properties": {
                        "seconds": {
                          "type": "number",
                          "sample": 1767950540
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 790776000
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
                              "sample": 9325
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
                          "sample": "受診4"
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
              ]
            },
            "nextPageToken": {
              "type": "string",
              "sample": "100"
            },
            "__typename": {
              "type": "string",
              "sample": "ListPatientFilesResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListPatientHospitalizations

**Hash**: `310930204c34a11c5c12c445ae356a4cf5e692f779512b6a542abef0d6869560`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
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
        "listPatientHospitalizations": {
          "type": "object",
          "properties": {
            "hospitalizations": {
              "type": "array",
              "length": 1,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "143bdf8a-2205-43db-b49d-1b5c50d1a943"
                    },
                    "patientUuid": {
                      "type": "string",
                      "sample": "a581024d-2dd9-436e-a509-631953666664"
                    },
                    "state": {
                      "type": "string",
                      "sample": "ADMITTED"
                    },
                    "routeType": {
                      "type": "null"
                    },
                    "referralType": {
                      "type": "null"
                    },
                    "preAdmissionHomeMedicalCareType": {
                      "type": "null"
                    },
                    "departmentTransferType": {
                      "type": "string",
                      "sample": "0"
                    },
                    "note": {
                      "type": "string",
                      "sample": ""
                    },
                    "lastHospitalizationLocation": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "9fe2f312-fd5d-452e-9b8b-c431b09d87b4"
                        },
                        "hospitalizationUuid": {
                          "type": "string",
                          "sample": "143bdf8a-2205-43db-b49d-1b5c50d1a943"
                        },
                        "wardUuid": {
                          "type": "object",
                          "properties": {
                            "value": {
                              "type": "string",
                              "sample": "30fc31d7-28b4-452d-8754-643b8b1aea9c"
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
                              "sample": "3089e80b-6b2b-41b0-931d-101d00be7808"
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
                              "sample": 2019
                            },
                            "month": {
                              "type": "number",
                              "sample": 6
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
                        "transferTime": {
                          "type": "object",
                          "properties": {
                            "hours": {
                              "type": "number",
                              "sample": 17
                            },
                            "minutes": {
                              "type": "number",
                              "sample": 44
                            },
                            "seconds": {
                              "type": "number",
                              "sample": 54
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
                              "sample": "30fc31d7-28b4-452d-8754-643b8b1aea9c"
                            },
                            "name": {
                              "type": "string",
                              "sample": "療養病棟"
                            },
                            "nameKana": {
                              "type": "string",
                              "sample": "リョウヨウビョウトウ"
                            },
                            "receiptWardType": {
                              "type": "string",
                              "sample": "LONG_TERM_CARE"
                            },
                            "wardCode": {
                              "type": "object",
                              "properties": {
                                "value": {
                                  "type": "string",
                                  "sample": "190640001"
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
                              "sample": "LONG_TERM_CARE_BEDS"
                            },
                            "ff1WardType": {
                              "type": "string",
                              "sample": "FF1_WARD_TYPE_OTHER"
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
                              "sample": "3089e80b-6b2b-41b0-931d-101d00be7808"
                            },
                            "wardUuid": {
                              "type": "string",
                              "sample": "30fc31d7-28b4-452d-8754-643b8b1aea9c"
                            },
                            "name": {
                              "type": "string",
                              "sample": "200"
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
                          "sample": true
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
                    "statusHospitalizationLocation": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "9fe2f312-fd5d-452e-9b8b-c431b09d87b4"
                        },
                        "hospitalizationUuid": {
                          "type": "string",
                          "sample": "143bdf8a-2205-43db-b49d-1b5c50d1a943"
                        },
                        "wardUuid": {
                          "type": "object",
                          "properties": {
                            "value": {
                              "type": "string",
                              "sample": "30fc31d7-28b4-452d-8754-643b8b1aea9c"
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
                              "sample": "3089e80b-6b2b-41b0-931d-101d00be7808"
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
                              "sample": 2019
                            },
                            "month": {
                              "type": "number",
                              "sample": 6
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
                        "transferTime": {
                          "type": "object",
                          "properties": {
                            "hours": {
                              "type": "number",
                              "sample": 17
                            },
                            "minutes": {
                              "type": "number",
                              "sample": 44
                            },
                            "seconds": {
                              "type": "number",
                              "sample": 54
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
                              "sample": "30fc31d7-28b4-452d-8754-643b8b1aea9c"
                            },
                            "name": {
                              "type": "string",
                              "sample": "療養病棟"
                            },
                            "nameKana": {
                              "type": "string",
                              "sample": "リョウヨウビョウトウ"
                            },
                            "receiptWardType": {
                              "type": "string",
                              "sample": "LONG_TERM_CARE"
                            },
                            "wardCode": {
                              "type": "object",
                              "properties": {
                                "value": {
                                  "type": "string",
                                  "sample": "190640001"
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
                              "sample": "LONG_TERM_CARE_BEDS"
                            },
                            "ff1WardType": {
                              "type": "string",
                              "sample": "FF1_WARD_TYPE_OTHER"
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
                              "sample": "3089e80b-6b2b-41b0-931d-101d00be7808"
                            },
                            "wardUuid": {
                              "type": "string",
                              "sample": "30fc31d7-28b4-452d-8754-643b8b1aea9c"
                            },
                            "name": {
                              "type": "string",
                              "sample": "200"
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
                          "sample": true
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
                    "startDate": {
                      "type": "object",
                      "properties": {
                        "year": {
                          "type": "number",
                          "sample": 2019
                        },
                        "month": {
                          "type": "number",
                          "sample": 6
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
                    "endDate": {
                      "type": "null"
                    },
                    "transferScheduledDate": {
                      "type": "null"
                    },
                    "hospitalizationDayCount": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "number",
                          "sample": 2397
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "UInt32Value"
                        }
                      }
                    },
                    "calculationStartDate": {
                      "type": "object",
                      "properties": {
                        "year": {
                          "type": "number",
                          "sample": 2019
                        },
                        "month": {
                          "type": "number",
                          "sample": 6
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
                    "hospitalizationDoctorUuid": {
                      "type": "string",
                      "sample": "c0b46cf6-fc1b-4da6-a9ad-cef02571dc48"
                    },
                    "hospitalizationDoctor": {
                      "type": "object",
                      "properties": {
                        "doctor": {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "de2cb411-0a8f-4b2f-8065-f8b2e3101098"
                            },
                            "name": {
                              "type": "string",
                              "sample": "満岡　弘巳"
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
                                  "sample": "マオカ　ヒロミ"
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
                    "urgency": {
                      "type": "null"
                    },
                    "communityBasedCareLocation": {
                      "type": "null"
                    },
                    "isEmergencyTransportation": {
                      "type": "null"
                    },
                    "isReceiptUnbillableHospitalization": {
                      "type": "boolean",
                      "sample": false
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
              "sample": ""
            },
            "__typename": {
              "type": "string",
              "sample": "ListPatientHospitalizationsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListPatientQualifications

**Hash**: `c7c2bbf4c550be293ad79b0caa7b9a0e5bd6b7b15b24fc33d95a55a58b5f14b5`
**Endpoint**: `/graphql-v2`

### Variables

```json
{
  "input": {
    "filterOnlyRecent": "boolean",
    "matchAgainstPatientId": "string",
    "syncJobId": "null",
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
        "listPatientQualifications": {
          "type": "object",
          "properties": {
            "patientQualifications": {
              "type": "array",
              "items": "empty"
            },
            "nextPageToken": {
              "type": "string",
              "sample": ""
            },
            "__typename": {
              "type": "string",
              "sample": "ListPatientQualificationsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListPatientReceiptDiseaseHistories

**Hash**: `a9027b596865d9ee4aef154a4f0352d7b9a8c3542bd34f2775b4122db42a48ff`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "patientReceiptDiseaseUuid": "string",
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
        "listPatientReceiptDiseaseHistories": {
          "type": "object",
          "properties": {
            "patientReceiptDiseaseHistories": {
              "type": "array",
              "length": 1,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "0e89c1bf-5290-4a83-b0e7-aff51c4b8f95"
                    },
                    "patientUuid": {
                      "type": "string",
                      "sample": "5dec3bfe-ad39-41ac-a8f9-ddaa800ffbc0"
                    },
                    "masterDiseaseCode": {
                      "type": "string",
                      "sample": "8837618"
                    },
                    "masterModifierCodes": {
                      "type": "array",
                      "length": 2,
                      "items": [
                        {
                          "type": "string",
                          "sample": "7274"
                        }
                      ]
                    },
                    "isMain": {
                      "type": "boolean",
                      "sample": false
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
                          "sample": 2026
                        },
                        "month": {
                          "type": "number",
                          "sample": 1
                        },
                        "day": {
                          "type": "number",
                          "sample": 10
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
                          "sample": "8837618"
                        },
                        "name": {
                          "type": "string",
                          "sample": "中足趾節関節捻挫"
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
                              "sample": "S935"
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
                      "length": 2,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "code": {
                              "type": "string",
                              "sample": "7274"
                            },
                            "name": {
                              "type": "string",
                              "sample": "母趾"
                            },
                            "position": {
                              "type": "string",
                              "sample": "PREFIX"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "MasterModifier"
                            }
                          }
                        }
                      ]
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
                    "createTime": {
                      "type": "object",
                      "properties": {
                        "seconds": {
                          "type": "number",
                          "sample": 1768025909
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 324173000
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
                          "sample": 1768025909
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 324173000
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
                          "sample": "5dec3bfe-ad39-41ac-a8f9-ddaa800ffbc0"
                        },
                        "serialNumber": {
                          "type": "string",
                          "sample": "20216"
                        },
                        "serialNumberPrefix": {
                          "type": "string",
                          "sample": ""
                        },
                        "fullName": {
                          "type": "string",
                          "sample": "辻 絵理佳"
                        },
                        "fullNamePhonetic": {
                          "type": "string",
                          "sample": "ツジ エリカ"
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
                              "sample": "5dec3bfe-ad39-41ac-a8f9-ddaa800ffbc0"
                            },
                            "addressLine_1": {
                              "type": "string",
                              "sample": "高松市 丸の内 6番26‐502号アルファステイツ丸の内"
                            },
                            "addressLine_2": {
                              "type": "string",
                              "sample": ""
                            },
                            "postalCode": {
                              "type": "string",
                              "sample": "7600033"
                            },
                            "email": {
                              "type": "string",
                              "sample": ""
                            },
                            "phoneNumber": {
                              "type": "string",
                              "sample": "08029941851"
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
                                  "sample": 1984
                                },
                                "month": {
                                  "type": "number",
                                  "sample": 4
                                },
                                "day": {
                                  "type": "number",
                                  "sample": 3
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "Date"
                                }
                              }
                            },
                            "memo": {
                              "type": "string",
                              "sample": "医療情報取得加算(初)08年01月"
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
                    "__typename": {
                      "type": "string",
                      "sample": "PatientReceiptDisease"
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
              "sample": "ListPatientReceiptDiseaseHistoriesResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListPatientReceiptDiseases

**Hash**: `616f117a30bc06f9034e0e06ff5ee765052a23426abc5d6a68d6b784819b22e6`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "patientCareType": "string",
    "patientUuids": [
      "string"
    ],
    "onlyMain": "boolean"
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
        "listPatientReceiptDiseases": {
          "type": "object",
          "properties": {
            "patientReceiptDiseases": {
              "type": "array",
              "length": 25,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "981ea4fc-0cb4-439e-ac52-7a90c0e854ab"
                    },
                    "patientUuid": {
                      "type": "string",
                      "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
                    },
                    "masterDiseaseCode": {
                      "type": "string",
                      "sample": "8540007"
                    },
                    "masterModifierCodes": {
                      "type": "array",
                      "items": "empty"
                    },
                    "isMain": {
                      "type": "boolean",
                      "sample": false
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
                          "sample": 12
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
                          "sample": "8540007"
                        },
                        "name": {
                          "type": "string",
                          "sample": "頭部外傷"
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
                              "sample": "S099"
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
                    "createTime": {
                      "type": "object",
                      "properties": {
                        "seconds": {
                          "type": "number",
                          "sample": 1765584856
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 987273000
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
                          "sample": 1765584856
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 987273000
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
                          "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
                        },
                        "serialNumber": {
                          "type": "string",
                          "sample": "16581"
                        },
                        "serialNumberPrefix": {
                          "type": "string",
                          "sample": ""
                        },
                        "fullName": {
                          "type": "string",
                          "sample": "大平 逸郎"
                        },
                        "fullNamePhonetic": {
                          "type": "string",
                          "sample": "オオヒラ イツロウ"
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
                              "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
                            },
                            "addressLine_1": {
                              "type": "string",
                              "sample": "高松市 高松町78番地10プレジデント屋島304"
                            },
                            "addressLine_2": {
                              "type": "string",
                              "sample": ""
                            },
                            "postalCode": {
                              "type": "string",
                              "sample": "7610104"
                            },
                            "email": {
                              "type": "string",
                              "sample": ""
                            },
                            "phoneNumber": {
                              "type": "string",
                              "sample": "843-6172"
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
                                  "sample": 1961
                                },
                                "month": {
                                  "type": "number",
                                  "sample": 4
                                },
                                "day": {
                                  "type": "number",
                                  "sample": 19
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "Date"
                                }
                              }
                            },
                            "memo": {
                              "type": "string",
                              "sample": "TEL:09031830046\n 医療情報取得加算(再)07年12月\n一包化処方"
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
                    "__typename": {
                      "type": "string",
                      "sample": "PatientReceiptDisease"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListPatientReceiptDiseasesResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListPatientSessions

**Hash**: `ebe30fd63a074d22d1feaafe92b08469fad1de719e1b654265681f40afb40af0`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "patientUuid": "string",
    "filterDateRange": {
      "start": {
        "year": "number",
        "month": "number",
        "day": "number"
      }
    },
    "includeEncounter": "boolean",
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

## ListPatientSessionsForConfirmSimilarSessions

**Hash**: `bd3703245e2b75fa94eb348a6eafba8d6ad635f6dc9f98b8d119a2e42d32355e`
**Endpoint**: `/graphql`

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
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "query": "string",
    "hospitalizationFilter": {
      "doctorUuid": "null",
      "roomUuids": "[]",
      "wardUuids": "[]",
      "states": "[]",
      "onlyLatest": "boolean"
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
        "listPatientSummaries": {
          "type": "object",
          "properties": {
            "statusCount": {
              "type": "array",
              "length": 4,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "status": {
                      "type": "string",
                      "sample": "WILL_ADMIT"
                    },
                    "count": {
                      "type": "number",
                      "sample": 1
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "ListPatientSummariesResponse_StatusCount"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListPatientSummariesResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListPatientsV2

**Hash**: `0163f0b5782e052cc317a193b1deac2c4d93d4017579774d90cc194fd7f42a08`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "generalFilter": {
      "query": "string",
      "patientCareType": "string"
    },
    "hospitalizationFilter": {
      "doctorUuid": "null",
      "roomUuids": "[]",
      "wardUuids": "[]",
      "states": "[]",
      "onlyLatest": "boolean"
    },
    "sorts": "[]",
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
        "listPatientsV2": {
          "type": "object",
          "properties": {
            "nextPageToken": {
              "type": "string",
              "sample": "100"
            },
            "entries": {
              "type": "array",
              "length": 100,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "id": {
                      "type": "string",
                      "sample": "p:cf96d699-3ee6-4f4e-9c8c-7e0b103d0f29"
                    },
                    "patient": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "cf96d699-3ee6-4f4e-9c8c-7e0b103d0f29"
                        },
                        "serialNumber": {
                          "type": "string",
                          "sample": "20214"
                        },
                        "serialNumberPrefix": {
                          "type": "string",
                          "sample": ""
                        },
                        "fullName": {
                          "type": "string",
                          "sample": "清川 榮"
                        },
                        "fullNamePhonetic": {
                          "type": "string",
                          "sample": "キヨカ サカエ"
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
                              "sample": "cf96d699-3ee6-4f4e-9c8c-7e0b103d0f29"
                            },
                            "addressLine_1": {
                              "type": "string",
                              "sample": "香川県高松市寺井町247 市住B-105"
                            },
                            "addressLine_2": {
                              "type": "string",
                              "sample": ""
                            },
                            "postalCode": {
                              "type": "string",
                              "sample": "761-8085"
                            },
                            "email": {
                              "type": "string",
                              "sample": ""
                            },
                            "phoneNumber": {
                              "type": "string",
                              "sample": "886－1391"
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
                                  "sample": 1941
                                },
                                "month": {
                                  "type": "number",
                                  "sample": 2
                                },
                                "day": {
                                  "type": "number",
                                  "sample": 21
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
                    "hospitalization": {
                      "type": "null"
                    },
                    "patientReceiptDiseases": {
                      "type": "array",
                      "items": "empty"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "ListPatientsV2Response_Entry"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListPatientsV2Response"
            }
          }
        }
      }
    }
  }
}
```

---

## ListPurposeOfVisits

**Hash**: `77f4f4540079f300ff2c2ec757e1a301f7b153fe39b06a95350dc54d09ef88bd`
**Endpoint**: `/graphql`

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

## ListRehabilitationDocuments

**Hash**: `b7a50dc3c27506e9c0fcdb13cb1b504487b8979fdd2ab5a54eaa83a95f907d3e`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "patientUuid": "string",
    "date": {
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
        "listRehabilitationDocuments": {
          "type": "object",
          "properties": {
            "documents": {
              "type": "array",
              "length": 33,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "9ac993b0-4936-418f-89fb-9708b47f04d7"
                    },
                    "rehabilitationOrderUuid": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "string",
                          "sample": "4d3d82ca-4039-4791-bcf1-09b8d043dff7"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "StringValue"
                        }
                      }
                    },
                    "patientUuid": {
                      "type": "string",
                      "sample": "403444d4-3c9a-4519-8fb5-124cf2dddc60"
                    },
                    "createUserUuid": {
                      "type": "string",
                      "sample": "2ed9cdf9-85fc-46e9-9648-f6ff8b0c6d84"
                    },
                    "editorData": {
                      "type": "string",
                      "sample": "{\n  \"blocks\": [\n    {\n      \"key\": \"j3n7\",\n      \"..."
                    },
                    "createTime": {
                      "type": "object",
                      "properties": {
                        "seconds": {
                          "type": "number",
                          "sample": 1767941806
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 316918000
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
                          "sample": 1767941806
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 316918000
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
                    "performTime": {
                      "type": "object",
                      "properties": {
                        "seconds": {
                          "type": "number",
                          "sample": 1767940140
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
                    "endTime": {
                      "type": "object",
                      "properties": {
                        "seconds": {
                          "type": "number",
                          "sample": 1767941400
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
                    "patient": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "403444d4-3c9a-4519-8fb5-124cf2dddc60"
                        },
                        "serialNumber": {
                          "type": "string",
                          "sample": "20156"
                        },
                        "serialNumberPrefix": {
                          "type": "string",
                          "sample": ""
                        },
                        "fullName": {
                          "type": "string",
                          "sample": "本田 茂樹"
                        },
                        "fullNamePhonetic": {
                          "type": "string",
                          "sample": "ホンダ シゲキ"
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
                              "sample": "403444d4-3c9a-4519-8fb5-124cf2dddc60"
                            },
                            "addressLine_1": {
                              "type": "string",
                              "sample": "香川県高松市香西南町546番地16"
                            },
                            "addressLine_2": {
                              "type": "string",
                              "sample": ""
                            },
                            "postalCode": {
                              "type": "string",
                              "sample": "7618014"
                            },
                            "email": {
                              "type": "string",
                              "sample": ""
                            },
                            "phoneNumber": {
                              "type": "string",
                              "sample": "09013276131"
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
                                  "sample": 1950
                                },
                                "month": {
                                  "type": "number",
                                  "sample": 7
                                },
                                "day": {
                                  "type": "number",
                                  "sample": 17
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
                          "length": 5,
                          "items": [
                            {
                              "type": "string",
                              "sample": "OT田中"
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
                    "createUser": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "2ed9cdf9-85fc-46e9-9648-f6ff8b0c6d84"
                        },
                        "name": {
                          "type": "string",
                          "sample": "入谷　そら"
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
                              "sample": "イリタニ　ソラ"
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
                          "sample": "2ed9cdf9-85fc-46e9-9648-f6ff8b0c6d84"
                        },
                        "name": {
                          "type": "string",
                          "sample": "入谷　そら"
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
                              "sample": "イリタニ　ソラ"
                            }
                          }
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "User"
                        }
                      }
                    },
                    "rehabilitationOrder": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "4d3d82ca-4039-4791-bcf1-09b8d043dff7"
                        },
                        "patientUuid": {
                          "type": "string",
                          "sample": "403444d4-3c9a-4519-8fb5-124cf2dddc60"
                        },
                        "patient": {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "403444d4-3c9a-4519-8fb5-124cf2dddc60"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "Patient"
                            }
                          }
                        },
                        "doctorUuid": {
                          "type": "string",
                          "sample": "5bbead66-558f-4382-a46d-140e9a304e4b"
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
                              "sample": 2
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
                              "sample": 30
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
                              "sample": 1764642602
                            },
                            "nanos": {
                              "type": "number",
                              "sample": 972951000
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
                              "sample": 1764658250
                            },
                            "nanos": {
                              "type": "number",
                              "sample": 736350000
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
                              "sample": "4d3d82ca-4039-4791-bcf1-09b8d043dff7"
                            },
                            "patientReceiptDiseaseUuid": {
                              "type": "object",
                              "properties": {
                                "value": {
                                  "type": "string",
                                  "sample": "a3788491-04b2-41fb-b74e-9f4f313cf828"
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
                                  "sample": 2
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
                              "sample": "肺癌術後、低酸素"
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
                              "length": 16,
                              "items": [
                                {
                                  "type": "string",
                                  "sample": "2008e5c7-b596-4477-8ed6-aedcacc87d2d"
                                }
                              ]
                            },
                            "rehabilitationCalculationTypeUuid": {
                              "type": "object",
                              "properties": {
                                "value": {
                                  "type": "string",
                                  "sample": "c86098b6-af99-49f3-b229-b3119eef5372"
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
                                  "sample": "8829c0f0-ac88-4df5-aa7e-910ac679ed24"
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "StringValue"
                                }
                              }
                            },
                            "rehabilitationKasanStartDateTypeUuid": {
                              "type": "object",
                              "properties": {
                                "value": {
                                  "type": "string",
                                  "sample": "ed20cf82-c092-4ddb-88af-2737a217242c"
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "StringValue"
                                }
                              }
                            },
                            "rehabilitationKasanStartDate": {
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
                                  "sample": 2
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "Date"
                                }
                              }
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
                                  "sample": "a3788491-04b2-41fb-b74e-9f4f313cf828"
                                },
                                "patientUuid": {
                                  "type": "string",
                                  "sample": "403444d4-3c9a-4519-8fb5-124cf2dddc60"
                                },
                                "masterDiseaseCode": {
                                  "type": "string",
                                  "sample": "8832545"
                                },
                                "masterModifierCodes": {
                                  "type": "array",
                                  "length": 1,
                                  "items": [
                                    {
                                      "type": "max_depth"
                                    }
                                  ]
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
                                      "type": "max_depth"
                                    },
                                    "month": {
                                      "type": "max_depth"
                                    },
                                    "day": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
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
                                      "type": "max_depth"
                                    },
                                    "name": {
                                      "type": "max_depth"
                                    },
                                    "isModifierNeeded": {
                                      "type": "max_depth"
                                    },
                                    "icd10Code_1": {
                                      "type": "max_depth"
                                    },
                                    "icd10Code_2": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "masterModifiers": {
                                  "type": "array",
                                  "length": 1,
                                  "items": [
                                    {
                                      "type": "max_depth"
                                    }
                                  ]
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
                                      "type": "max_depth"
                                    },
                                    "name": {
                                      "type": "max_depth"
                                    },
                                    "namePhonetic": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "createTime": {
                                  "type": "object",
                                  "properties": {
                                    "seconds": {
                                      "type": "max_depth"
                                    },
                                    "nanos": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "updateTime": {
                                  "type": "object",
                                  "properties": {
                                    "seconds": {
                                      "type": "max_depth"
                                    },
                                    "nanos": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
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
                                      "type": "max_depth"
                                    },
                                    "serialNumber": {
                                      "type": "max_depth"
                                    },
                                    "serialNumberPrefix": {
                                      "type": "max_depth"
                                    },
                                    "fullName": {
                                      "type": "max_depth"
                                    },
                                    "fullNamePhonetic": {
                                      "type": "max_depth"
                                    },
                                    "isDraft": {
                                      "type": "max_depth"
                                    },
                                    "isTestPatient": {
                                      "type": "max_depth"
                                    },
                                    "detail": {
                                      "type": "max_depth"
                                    },
                                    "tags": {
                                      "type": "max_depth"
                                    },
                                    "attentionSummary": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
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
                                  "sample": "c86098b6-af99-49f3-b229-b3119eef5372"
                                },
                                "name": {
                                  "type": "string",
                                  "sample": "運動器リハビリテーション"
                                },
                                "period": {
                                  "type": "object",
                                  "properties": {
                                    "value": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "isShikkanbetsuRehabilitation": {
                                  "type": "boolean",
                                  "sample": true
                                },
                                "therapyStartDateTypes": {
                                  "type": "array",
                                  "length": 4,
                                  "items": [
                                    {
                                      "type": "max_depth"
                                    }
                                  ]
                                },
                                "rehabilitationKasanStartDateTypes": {
                                  "type": "array",
                                  "length": 3,
                                  "items": [
                                    {
                                      "type": "max_depth"
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
                              "length": 16,
                              "items": [
                                {
                                  "type": "object",
                                  "properties": {
                                    "uuid": {
                                      "type": "max_depth"
                                    },
                                    "category": {
                                      "type": "max_depth"
                                    },
                                    "name": {
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
                              "sample": "RehabilitationOrderDetail"
                            }
                          }
                        },
                        "atLeastOneExecuted": {
                          "type": "boolean",
                          "sample": true
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
                        "createUser": {
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
                        "updateUser": {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "fb87c42d-9908-47c4-be63-fc708c352fe8"
                            },
                            "name": {
                              "type": "string",
                              "sample": "三井　大輝"
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
                                  "sample": "ミツイ　ヒロキ"
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
                          "sample": false
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "RehabilitationOrder"
                        }
                      }
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "RehabilitationDocument"
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
              "sample": "ListRehabilitationDocumentsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListRehabilitationDocumentTemplates

**Hash**: `07aa49636d6ae58c55fdcb9d035b188eb8e21ff152fc50f11be24fa71d55bbd6`
**Endpoint**: `/graphql`

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
**Endpoint**: `/graphql`

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
        "listRehabilitationPlans": {
          "type": "object",
          "properties": {
            "rehabilitationPlans": {
              "type": "array",
              "length": 32,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "2008e5c7-b596-4477-8ed6-aedcacc87d2d"
                    },
                    "category": {
                      "type": "string",
                      "sample": "PT"
                    },
                    "name": {
                      "type": "string",
                      "sample": "評価"
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
              "sample": "ListRehabilitationPlansResponse"
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
**Endpoint**: `/graphql`

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
**Endpoint**: `/graphql`

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
        "listRoomsInAllWards": {
          "type": "object",
          "properties": {
            "rooms": {
              "type": "array",
              "length": 32,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "3089e80b-6b2b-41b0-931d-101d00be7808"
                    },
                    "wardUuid": {
                      "type": "string",
                      "sample": "30fc31d7-28b4-452d-8754-643b8b1aea9c"
                    },
                    "name": {
                      "type": "string",
                      "sample": "200"
                    },
                    "isCommunityBasedCare": {
                      "type": "boolean",
                      "sample": false
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "Room"
                    },
                    "memo": {
                      "type": "string",
                      "sample": ""
                    },
                    "bedCount": {
                      "type": "number",
                      "sample": 4
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListRoomsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListScheduledOrders

**Hash**: `7cbbef94728f6ae2b18e2dbb6bdf8966ad231f725135da28f1bd4cad2212d331`
**Endpoint**: `/graphql`

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
                      "length": 5,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "612da1ff-a920-4062-b052-c12562c02218"
                            },
                            "orderType": {
                              "type": "string",
                              "sample": "ORDER_TYPE_NUTRITION"
                            },
                            "order": {
                              "type": "object",
                              "properties": {
                                "uuid": {
                                  "type": "string",
                                  "sample": "612da1ff-a920-4062-b052-c12562c02218"
                                },
                                "imagingOrder": {
                                  "type": "null"
                                },
                                "nutritionOrder": {
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
                                    "hasSpecialDietCharges": {
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
                      "items": "empty"
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
**Endpoint**: `/graphql`

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

## ListScheduledToLeaveHospitalizations

**Hash**: `1b99d647f4e1798d8eda11330378d1a4575799a8860e5e145d54bfde13e5d7f5`
**Endpoint**: `/graphql`

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
**Endpoint**: `/graphql`

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
        "listSectionedOrdersInPatient": {
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
                          "sample": 9
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Date"
                        }
                      }
                    },
                    "orders": {
                      "type": "array",
                      "length": 2,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "6451a259-7f1b-4101-9714-9fade441aa2d"
                            },
                            "orderType": {
                              "type": "string",
                              "sample": "ORDER_TYPE_IMAGING"
                            },
                            "order": {
                              "type": "object",
                              "properties": {
                                "uuid": {
                                  "type": "string",
                                  "sample": "6451a259-7f1b-4101-9714-9fade441aa2d"
                                },
                                "imagingOrder": {
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
                                    "sessionUuid": {
                                      "type": "max_depth"
                                    },
                                    "orderStatus": {
                                      "type": "max_depth"
                                    },
                                    "date": {
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
                                    "revokeDescription": {
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
                      "items": "empty"
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
              "sample": "7"
            },
            "__typename": {
              "type": "string",
              "sample": "ListSectionedOrdersInPatientResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListSectionedScheduledOrdersInPatient

**Hash**: `622473c362597ba43557476444e862b6895e3d5daaeed4f9650dac5cf6dc2b0b`
**Endpoint**: `/graphql`

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
                          "sample": 10
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Date"
                        }
                      }
                    },
                    "orders": {
                      "type": "array",
                      "length": 5,
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
                      "items": "empty"
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
              "sample": "20457"
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
**Endpoint**: `/graphql`

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
              "length": 47,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "8a0849d7-5176-49c4-ad38-8e0a7fa7c0bc"
                    },
                    "doctorUuid": {
                      "type": "string",
                      "sample": "5bbead66-558f-4382-a46d-140e9a304e4b"
                    },
                    "purposeOfVisitUuid": {
                      "type": "string",
                      "sample": "acdfdb0a-b7d2-4fad-96d9-fc6bb96a8c77"
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
                          "sample": 1767945556
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 238446000
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
                    "scheduleTime": {
                      "type": "object",
                      "properties": {
                        "seconds": {
                          "type": "number",
                          "sample": 1767945481
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
                          "sample": 1767945497
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 865011000
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
                          "sample": 1767945497
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 865011000
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Timestamp"
                        }
                      }
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
                          "sample": "c79615c5-6d98-4991-a79e-2af684513351"
                        },
                        "serialNumber": {
                          "type": "string",
                          "sample": "18342"
                        },
                        "serialNumberPrefix": {
                          "type": "string",
                          "sample": ""
                        },
                        "fullName": {
                          "type": "string",
                          "sample": "新地 末子"
                        },
                        "fullNamePhonetic": {
                          "type": "string",
                          "sample": "シンチ スエコ"
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
                              "sample": "c79615c5-6d98-4991-a79e-2af684513351"
                            },
                            "addressLine_1": {
                              "type": "string",
                              "sample": "高松市東山崎町58-14 "
                            },
                            "addressLine_2": {
                              "type": "string",
                              "sample": ""
                            },
                            "postalCode": {
                              "type": "string",
                              "sample": "761-0312"
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
                              "sample": "SEX_TYPE_FEMALE"
                            },
                            "birthDate": {
                              "type": "object",
                              "properties": {
                                "year": {
                                  "type": "number",
                                  "sample": 1933
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
                              "sample": "医療情報取得加算(再)R7年12月"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "PatientDetail"
                            }
                          }
                        },
                        "tags": {
                          "type": "array",
                          "length": 1,
                          "items": [
                            {
                              "type": "string",
                              "sample": "クレール慶"
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
                          "sample": "8cba8d28-9edb-4ec2-9e98-3241a85a0513"
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
                    "encounterHasBeenPublished": {
                      "type": "boolean",
                      "sample": true
                    },
                    "outpatientAccountingUuid": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "string",
                          "sample": "0e2ee503-ed31-11f0-be9e-67c8d6eacc05"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "StringValue"
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
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "fullName": "string",
    "fullNamePhonetic": "string",
    "birthDate": {
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
        "listSimilarPatients": {
          "type": "object",
          "properties": {
            "patients": {
              "type": "array",
              "length": 1,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "a581024d-2dd9-436e-a509-631953666664"
                    },
                    "serialNumber": {
                      "type": "string",
                      "sample": "17117"
                    },
                    "serialNumberPrefix": {
                      "type": "string",
                      "sample": ""
                    },
                    "fullName": {
                      "type": "string",
                      "sample": "加藤 和子"
                    },
                    "fullNamePhonetic": {
                      "type": "string",
                      "sample": "カトウ カズコ"
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
                          "sample": "a581024d-2dd9-436e-a509-631953666664"
                        },
                        "addressLine_1": {
                          "type": "string",
                          "sample": "高松市今里町1丁目443"
                        },
                        "addressLine_2": {
                          "type": "string",
                          "sample": ""
                        },
                        "postalCode": {
                          "type": "string",
                          "sample": "760-0078"
                        },
                        "email": {
                          "type": "string",
                          "sample": ""
                        },
                        "phoneNumber": {
                          "type": "string",
                          "sample": "09031898711"
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
                              "sample": 1948
                            },
                            "month": {
                              "type": "number",
                              "sample": 6
                            },
                            "day": {
                              "type": "number",
                              "sample": 22
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "Date"
                            }
                          }
                        },
                        "memo": {
                          "type": "string",
                          "sample": "高額0609,0610,0612,0710,"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "PatientDetail"
                        }
                      }
                    },
                    "tags": {
                      "type": "array",
                      "length": 5,
                      "items": [
                        {
                          "type": "string",
                          "sample": "護送"
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
                    },
                    "patientSessionScheduleTime": {
                      "type": "object",
                      "properties": {
                        "patientUuid": {
                          "type": "string",
                          "sample": "a581024d-2dd9-436e-a509-631953666664"
                        },
                        "nextSessionScheduleTime": {
                          "type": "null"
                        },
                        "previousSessionScheduleTime": {
                          "type": "null"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "PatientSessionScheduleTime"
                        }
                      }
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListSimilarPatientsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListSpecimenInspectionOrderHistories

**Hash**: `b575bd291c17f446a881c047e426942587aa096559095cc87ddebe686a04197b`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "specimenInspectionOrderUuid": "string",
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
        "listSpecimenInspectionOrderHistories": {
          "type": "object",
          "properties": {
            "specimenInspectionOrderHistories": {
              "type": "array",
              "length": 2,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "64636fdd-3f5a-4a95-b246-9989a5517a93"
                    },
                    "patientUuid": {
                      "type": "string",
                      "sample": "cddebab0-1307-4de7-b62b-6e2a6aefaa8a"
                    },
                    "patient": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "cddebab0-1307-4de7-b62b-6e2a6aefaa8a"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Patient"
                        }
                      }
                    },
                    "doctorUuid": {
                      "type": "string",
                      "sample": "5bbead66-558f-4382-a46d-140e9a304e4b"
                    },
                    "orderStatus": {
                      "type": "string",
                      "sample": "ORDER_STATUS_PREPARING"
                    },
                    "atLeastOneExecuted": {
                      "type": "boolean",
                      "sample": false
                    },
                    "inspectionDate": {
                      "type": "null"
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
                          "sample": 1750986449
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 140000000
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
                          "sample": 1750997571
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 996747000
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Timestamp"
                        }
                      }
                    },
                    "revokeDescription": {
                      "type": "string",
                      "sample": ""
                    },
                    "specimenInspectionOrderSpecimenInspections": {
                      "type": "array",
                      "length": 1,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "032cbce5-bd05-440f-a94d-4ebc6c7f1f8b"
                            },
                            "specimenInspectionUuid": {
                              "type": "string",
                              "sample": "840780c1-6817-49c0-b224-7e94dc60cdbd"
                            },
                            "specimenInspection": {
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
                                      "type": "max_depth"
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
                            },
                            "consultationOutsideInspections": {
                              "type": "array",
                              "items": "empty"
                            },
                            "consultationDiagnoses": {
                              "type": "array",
                              "length": 2,
                              "items": [
                                {
                                  "type": "object",
                                  "properties": {
                                    "uuid": {
                                      "type": "max_depth"
                                    },
                                    "orderType": {
                                      "type": "max_depth"
                                    },
                                    "paramValue": {
                                      "type": "max_depth"
                                    },
                                    "isCalculatable": {
                                      "type": "max_depth"
                                    },
                                    "masterDiagnosis": {
                                      "type": "max_depth"
                                    },
                                    "comments": {
                                      "type": "max_depth"
                                    },
                                    "bodyPartComments": {
                                      "type": "max_depth"
                                    },
                                    "specimenDiagnosis": {
                                      "type": "max_depth"
                                    },
                                    "isFeeForService": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                }
                              ]
                            },
                            "consultationMedicines": {
                              "type": "array",
                              "items": "empty"
                            },
                            "consultationEquipments": {
                              "type": "array",
                              "items": "empty"
                            },
                            "note": {
                              "type": "string",
                              "sample": ""
                            },
                            "urgency": {
                              "type": "boolean",
                              "sample": false
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "SpecimenInspectionOrder_SpecimenInspectionOrderSpe..."
                            }
                          }
                        }
                      ]
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
                    "createUser": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "5182b5da-9394-4935-86fa-6cb402826a57"
                        },
                        "name": {
                          "type": "string",
                          "sample": "片山　優子"
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
                              "sample": "カタヤマ　ユウコ"
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
                    "encounterId": {
                      "type": "null"
                    },
                    "extendedInsuranceCombinationId": {
                      "type": "null"
                    },
                    "sendInspectionRequest": {
                      "type": "boolean",
                      "sample": true
                    },
                    "hasUnrequestedChanges": {
                      "type": "boolean",
                      "sample": false
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
                      "sample": "SpecimenInspectionOrder"
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
              "sample": "ListSpecimenInspectionOrderHistoriesResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListSpecimenInspections

**Hash**: `9b42b34d4d780d65ccc58f511d7ba6d38150fbdf76a3b43d431f0976186515ef`
**Endpoint**: `/graphql`

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

## ListSurgeryDocumentTemplates

**Hash**: `c61664cb2e3d78a23d2435a11a44b001c2528ca712e9a852f09218749f1ffd85`
**Endpoint**: `/graphql`

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

## ListUnscheduledRoomsHospitalizations

**Hash**: `385c598ecbf18dae07020362ebc0a9c3458089d054b933cdd1465242f72ea8a3`
**Endpoint**: `/graphql`

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
**Endpoint**: `/graphql`

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
        "listUserClinicalRecordViewFilters": {
          "type": "object",
          "properties": {
            "userClinicalRecordViewFilters": {
              "type": "array",
              "length": 4,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "f6df6c63-3a91-4c13-8442-447c3f6042ad"
                    },
                    "title": {
                      "type": "string",
                      "sample": "Progress"
                    },
                    "filterClinicalResourceHrns": {
                      "type": "array",
                      "length": 12,
                      "items": [
                        {
                          "type": "string",
                          "sample": "//henry-app.jp/clinicalResource/vitalSign"
                        }
                      ]
                    },
                    "filterCreateUserUuids": {
                      "type": "array",
                      "length": 98,
                      "items": [
                        {
                          "type": "string",
                          "sample": "1bbf83c7-4eeb-4cce-9524-12173014245b"
                        }
                      ]
                    },
                    "filterAccountingOrderShinryoShikibetsus": {
                      "type": "array",
                      "items": "empty"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "UserClinicalRecordViewFilter"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListUserClinicalRecordViewFiltersResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListUsers

**Hash**: `8a8291de67b7c64c15b896e18df8a725b398615816b65e789b1a798557f9d785`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "role": "string",
    "onlyNarcoticPractitioner": "boolean"
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
        "listUsers": {
          "type": "object",
          "properties": {
            "users": {
              "type": "array",
              "length": 20,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "2fbef2da-8d6b-416a-8773-b457aa693652"
                    },
                    "name": {
                      "type": "string",
                      "sample": "操作　医師"
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
                          "sample": "ソウサ　テスト"
                        }
                      }
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "User"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListUsersResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## ListWardOccupancy

**Hash**: `365c56183990e9355f0e0228bbb8a3569646a61797cb280bb5f58467e5a8943b`
**Endpoint**: `/graphql`

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
                      "sample": 0.5519999861717224
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
**Endpoint**: `/graphql`

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
        "listWards": {
          "type": "object",
          "properties": {
            "wards": {
              "type": "array",
              "length": 2,
              "items": [
                {
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
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "ListWardsResponse"
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
**Endpoint**: `/graphql-v2`

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
        "nursingPlanTemplates": {
          "type": "object",
          "properties": {
            "nursingPlanTemplates": {
              "type": "array",
              "length": 100,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "id": {
                      "type": "string",
                      "sample": "9fc78a8f-0dd8-4744-84cc-3167b3533fe8"
                    },
                    "editorData": {
                      "type": "string",
                      "sample": "{\n  \"blocks\": [\n    {\n      \"key\": \"74sp2\",\n      ..."
                    },
                    "nursingProblem": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string",
                          "sample": "b04560c4-565a-4bfc-85c5-38394bf340c5"
                        },
                        "grandparentName": {
                          "type": "object",
                          "properties": {
                            "value": {
                              "type": "string",
                              "sample": "ヘルスプロモーション"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "StringValue"
                            }
                          }
                        },
                        "parentName": {
                          "type": "object",
                          "properties": {
                            "value": {
                              "type": "string",
                              "sample": "ヘルスリテラシー促進準備状態"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "StringValue"
                            }
                          }
                        },
                        "name": {
                          "type": "string",
                          "sample": "健康の促進・維持・健康リスク軽減のための知識や社会資源が不足している"
                        },
                        "displayOrder": {
                          "type": "number",
                          "sample": 1
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "NursingProblem"
                        }
                      }
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "NursingPlanTemplate"
                    }
                  }
                }
              ]
            },
            "nextPageToken": {
              "type": "string",
              "sample": "100"
            },
            "__typename": {
              "type": "string",
              "sample": "NursingPlanTemplatesResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## PublishDraftEncounterRecords

**Hash**: `9dc5991131884e136b97547b983937bae0c0fd213e763545fb0cd3857a413f02`
**Endpoint**: `/graphql-v2`

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
        "publishDraftEncounterRecords": {
          "type": "boolean",
          "sample": true
        }
      }
    }
  }
}
```

---

## PublishDraftEncounterTemplateRecords

**Hash**: `74fc96e82f1f21e72ec2769cfc325c79f129f4447a6f80a8efd86f281644f72b`
**Endpoint**: `/graphql-v2`

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
        "publishDraftEncounterTemplateRecords": {
          "type": "boolean",
          "sample": true
        }
      }
    }
  }
}
```

---

## RecordAnalyticalEvent

**Hash**: `55ce35a36461f2283a7b15d3858fd002d21f8ab78c52734d3b389244fada2d84`
**Endpoint**: `/graphql`

### Variables

```json
{
  "eventName": "string",
  "eventData": {
    "windowInstanceIds": "[]",
    "page": {
      "pathname": "string",
      "query": "string"
    },
    "isMaintenanceUser": "boolean",
    "patientUuid": "string",
    "activeFilterUuid": "string",
    "activeFilterName": "string",
    "activeFilterType": "string"
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
        "recordAnalyticalEvent": {
          "type": "object",
          "properties": {
            "_": {
              "type": "null"
            },
            "__typename": {
              "type": "string",
              "sample": "Empty"
            }
          }
        }
      }
    }
  }
}
```

---

## SaveEncounterTemplate

**Hash**: `686c44230dbad179cefe87737e2b32c66457d2c5ce0fb3c43f70b2d68020143b`
**Endpoint**: `/graphql-v2`

### Variables

```json
{
  "input": {
    "id": "string",
    "folderId": "null",
    "isDraft": "boolean"
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
        "saveEncounterTemplate": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "sample": "d414be7c-0f27-4858-a4ef-d6da515ea310"
            },
            "startDate": {
              "type": "null"
            },
            "endDate": {
              "type": "null"
            },
            "title": {
              "type": "string",
              "sample": ""
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
              "items": "empty"
            },
            "isDraft": {
              "type": "boolean",
              "sample": false
            },
            "__typename": {
              "type": "string",
              "sample": "EncounterTemplate"
            }
          }
        }
      }
    }
  }
}
```

---

## SaveEncounterTemplateFolder

**Hash**: `46bc65aea627f6383444f43350fe4ea6e85baa9c028e17fab1d540b217218189`
**Endpoint**: `/graphql-v2`

### Variables

```json
{
  "input": {
    "id": "string",
    "name": "string",
    "parentFolderId": "string",
    "patientId": "null"
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
        "saveEncounterTemplateFolder": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "sample": "8666ff06-20e8-4b6e-902a-60d76c348fc8"
            },
            "name": {
              "type": "string",
              "sample": "処方"
            },
            "numOfContents": {
              "type": "number",
              "sample": 0
            },
            "patient": {
              "type": "null"
            },
            "__typename": {
              "type": "string",
              "sample": "EncounterTemplateFolder"
            },
            "parentFolder": {
              "type": "object",
              "properties": {
                "id": {
                  "type": "string",
                  "sample": "6bb6421e-eead-45ff-af6e-d70509cb04a9"
                },
                "name": {
                  "type": "string",
                  "sample": "テスト"
                },
                "numOfContents": {
                  "type": "number",
                  "sample": 73
                },
                "patient": {
                  "type": "null"
                },
                "__typename": {
                  "type": "string",
                  "sample": "EncounterTemplateFolder"
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

## SavePatientReceiptDiseaseTemplate

**Hash**: `96521480f8fe16076b4f0ffd4642cb671969d45c02f9f5680ef298f6371a4e22`
**Endpoint**: `/graphql-v2`

### Variables

```json
{
  "input": {
    "id": "string",
    "encounterTemplateId": "string",
    "intractableDiseaseType": "string",
    "isMain": "boolean",
    "isSuspected": "boolean",
    "patientReceiptDiseaseModifierCodes": "[]",
    "customDiseaseName": "null",
    "masterDiseaseCode": "string"
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
        "savePatientReceiptDiseaseTemplate": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "sample": "1dc57930-89cf-4820-857a-50fa37adeda7"
            },
            "masterDiseaseCode": {
              "type": "string",
              "sample": "7240012"
            },
            "masterDisease": {
              "type": "object",
              "properties": {
                "code": {
                  "type": "string",
                  "sample": "7240012"
                },
                "name": {
                  "type": "string",
                  "sample": "腰部脊柱管狭窄症"
                },
                "__typename": {
                  "type": "string",
                  "sample": "MasterDisease"
                }
              }
            },
            "masterModifierCodes": {
              "type": "array",
              "items": "empty"
            },
            "masterModifiers": {
              "type": "array",
              "items": "empty"
            },
            "customDiseaseName": {
              "type": "null"
            },
            "isMain": {
              "type": "boolean",
              "sample": false
            },
            "isSuspected": {
              "type": "boolean",
              "sample": false
            },
            "isDeleted": {
              "type": "boolean",
              "sample": false
            },
            "intractableDiseaseType": {
              "type": "string",
              "sample": "NOT_APPLICABLE"
            },
            "__typename": {
              "type": "string",
              "sample": "PatientReceiptDiseaseTemplate"
            }
          }
        }
      }
    }
  }
}
```

---

## SaveProgressNote

**Hash**: `b921a572ae783c7152518fa962bae27d0c84cacf4e426ebbc93970e3a028853b`
**Endpoint**: `/graphql-v2`

### Variables

```json
{
  "input": {
    "encounterId": "string",
    "id": "string",
    "title": "string",
    "editorData": "string"
  },
  "saveAsDraft": "boolean"
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
        "saveProgressNote": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "sample": "dd8f5bff-29ab-4c39-8ee5-68264f6d66c9"
            },
            "isDraft": {
              "type": "boolean",
              "sample": true
            },
            "__typename": {
              "type": "string",
              "sample": "ProgressNote"
            }
          }
        }
      }
    }
  }
}
```

---

## SaveProgressNoteTemplate

**Hash**: `7af96bf9c82476ee415bde928748f0ca22c8d0aa73735c6393b7d58c55dedfe6`
**Endpoint**: `/graphql-v2`

### Variables

```json
{
  "input": {
    "id": "string",
    "encounterTemplateId": "string",
    "title": "string",
    "editorData": "null"
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
        "saveProgressNoteTemplate": {
          "type": "object",
          "properties": {
            "id": {
              "type": "string",
              "sample": "15bb6bd7-0a4d-4e0d-a4e0-f6b5b2a55c44"
            },
            "__typename": {
              "type": "string",
              "sample": "ProgressNoteTemplate"
            }
          }
        }
      }
    }
  }
}
```

---

## SearchAccountingOrderTemplates

**Hash**: `f831c9fe37309a844b3fc107fbf5afdbfc933b81d30bf38cc4c951780447cd42`
**Endpoint**: `/graphql`

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

## SearchCanonicalPrescriptionUsages

**Hash**: `59f22b8f65f524107768bf32ad8be9c6821f120e6fd8ac68db20e74abae6d388`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "query": "string",
    "masterMedicineCode": "string",
    "dosageFormType": "number",
    "useAsNeeded": "boolean",
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
        "searchCanonicalPrescriptionUsages": {
          "type": "object",
          "properties": {
            "canonicalPrescriptionUsages": {
              "type": "array",
              "length": 35,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "c0549abb-fd25-40d3-92b9-2f8f7d8031c6"
                    },
                    "text": {
                      "type": "string",
                      "sample": "１日１回"
                    },
                    "useAsNeeded": {
                      "type": "boolean",
                      "sample": false
                    },
                    "timings": {
                      "type": "array",
                      "items": "empty"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "CanonicalPrescriptionUsage"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "SearchCanonicalPrescriptionUsagesResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## SearchDiagnoses

**Hash**: `ac644a15e46fe78308fc91e286702b17a4f24b39ae1bbd51e32b0d9122dc3125`
**Endpoint**: `/graphql`

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
    "pageToken": "string",
    "bedCount": "number",
    "patientCareType": "string",
    "codeTableItems": [
      {
        "codeTableItemAlphabet": "string",
        "codeTableItemSectionNumber": "number"
      }
    ]
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
        "searchDiagnoses": {
          "type": "object",
          "properties": {
            "diagnoses": {
              "type": "array",
              "length": 50,
              "items": [
                {
                  "type": "object",
                  "properties": {
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
                    "isSpecimenComment": {
                      "type": "boolean",
                      "sample": false
                    },
                    "isSpecimenInspection": {
                      "type": "boolean",
                      "sample": true
                    },
                    "applicableConsultationTypeCodes": {
                      "type": "array",
                      "length": 1,
                      "items": [
                        {
                          "type": "string",
                          "sample": "60"
                        }
                      ]
                    },
                    "isDiminishing": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "boolean",
                          "sample": false
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "BoolValue"
                        }
                      }
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
                    "pointType": {
                      "type": "object",
                      "properties": {
                        "value": {
                          "type": "number",
                          "sample": 3
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "UInt32Value"
                        }
                      }
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "MasterDiagnosis"
                    }
                  }
                }
              ]
            },
            "nextPageToken": {
              "type": "string",
              "sample": "50"
            },
            "__typename": {
              "type": "string",
              "sample": "SearchDiagnosesResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## SearchDiseases

**Hash**: `d01ef4177144a2a0a4092165784cb036fb60ec49ff2e1897dc7d4402d7466137`
**Endpoint**: `/graphql`

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
    "indicationContext": "null",
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
        "searchDiseases": {
          "type": "object",
          "properties": {
            "diseases": {
              "type": "array",
              "length": 100,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "code": {
                      "type": "string",
                      "sample": "0000999"
                    },
                    "name": {
                      "type": "string",
                      "sample": "(未コード化傷病名)"
                    },
                    "isModifierNeeded": {
                      "type": "boolean",
                      "sample": true
                    },
                    "icd10Code_1": {
                      "type": "null"
                    },
                    "icd10Code_2": {
                      "type": "null"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "MasterDisease"
                    }
                  }
                }
              ]
            },
            "nextPageToken": {
              "type": "string",
              "sample": "1"
            },
            "__typename": {
              "type": "string",
              "sample": "SearchDiseasesResponse"
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
**Endpoint**: `/graphql`

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
**Endpoint**: `/graphql`

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
        "searchInjectionOrderTemplates": {
          "type": "object",
          "properties": {
            "injectionOrderTemplates": {
              "type": "array",
              "items": "empty"
            },
            "nextPageToken": {
              "type": "string",
              "sample": ""
            },
            "__typename": {
              "type": "string",
              "sample": "SearchInjectionOrderTemplatesResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## SearchMedicinesV2

**Hash**: `8fe48cbcb9c7fe133b52087bb91401482e81993d4d898a5ab2609fc7c7e6f80e`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "pageSize": "number",
    "pageToken": "string",
    "searchDate": {
      "year": "number",
      "month": "number",
      "day": "number"
    },
    "query": "string",
    "patientCareType": "string",
    "filterDosageFormTypes": [
      "number"
    ],
    "excludeSenteiRyoyoKanjaKibo": "boolean"
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
        "searchMedicinesV2": {
          "type": "object",
          "properties": {
            "medicineResources": {
              "type": "array",
              "length": 100,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "localMedicine": {
                      "type": "object",
                      "properties": {
                        "uuid": {
                          "type": "string",
                          "sample": "704518f1-3daa-4089-8844-338aa62f5893"
                        },
                        "mhlwMedicineCode": {
                          "type": "string",
                          "sample": "622198901"
                        },
                        "name": {
                          "type": "string",
                          "sample": "トレシーバ注　フレックスタッチ　３００単位"
                        },
                        "nameKana": {
                          "type": "string",
                          "sample": "トレシーバフレックスタッチ"
                        },
                        "description": {
                          "type": "string",
                          "sample": ""
                        },
                        "patientCareType": {
                          "type": "string",
                          "sample": "PATIENT_CARE_TYPE_OUTPATIENT"
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
                              "sample": 6
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
                        "applicableDosageFormTypes": {
                          "type": "array",
                          "length": 1,
                          "items": [
                            {
                              "type": "number",
                              "sample": 4
                            }
                          ]
                        },
                        "masterMedicine": {
                          "type": "object",
                          "properties": {
                            "code": {
                              "type": "string",
                              "sample": "622198901"
                            },
                            "name": {
                              "type": "string",
                              "sample": "トレシーバ注　フレックスタッチ　３００単位"
                            },
                            "unitCode": {
                              "type": "number",
                              "sample": 51
                            },
                            "dosageFormType": {
                              "type": "number",
                              "sample": 4
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
                                  "sample": 184100
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
                    },
                    "mhlwMedicine": {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "sample": "622198901"
                        },
                        "dosageFormType": {
                          "type": "number",
                          "sample": 4
                        },
                        "id": {
                          "type": "string",
                          "sample": "62219890120250401"
                        },
                        "name": {
                          "type": "string",
                          "sample": "トレシーバ注　フレックスタッチ　３００単位"
                        },
                        "price": {
                          "type": "object",
                          "properties": {
                            "value": {
                              "type": "number",
                              "sample": 184100
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "Frac100"
                            }
                          }
                        },
                        "priceType": {
                          "type": "number",
                          "sample": 1
                        },
                        "psychiatricDrugType": {
                          "type": "number",
                          "sample": 0
                        },
                        "unitCode": {
                          "type": "number",
                          "sample": 51
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
                        "selectiveMedicalServiceType": {
                          "type": "string",
                          "sample": "SELECTIVE_MEDICAL_SERVICE_TYPE_UNSPECIFIED"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "MhlwMedicine"
                        }
                      }
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "SearchMedicinesV2Response_MedicineResource"
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
              "sample": "SearchMedicinesV2Response"
            }
          }
        }
      }
    }
  }
}
```

---

## SearchMhlwEquipments

**Hash**: `6ac8580d2a612cfde038b5f85009c3ecd1153413328d4f9fddd4bf9bd24d8956`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "pageSize": "number",
    "pageToken": "string",
    "searchDate": {
      "year": "number",
      "month": "number",
      "day": "number"
    },
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
        "searchMhlwEquipments": {
          "type": "object",
          "properties": {
            "equipmentResources": {
              "type": "array",
              "length": 100,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "mhlwEquipment": {
                      "type": "object",
                      "properties": {
                        "code": {
                          "type": "string",
                          "sample": "728040000"
                        },
                        "id": {
                          "type": "string",
                          "sample": "72804000020200401"
                        },
                        "name": {
                          "type": "string",
                          "sample": "３管分離逆止弁付バルーン直腸カテーテル"
                        },
                        "isParamRequired": {
                          "type": "boolean",
                          "sample": true
                        },
                        "isUnitCodeRequired": {
                          "type": "boolean",
                          "sample": true
                        },
                        "startDate": {
                          "type": "object",
                          "properties": {
                            "year": {
                              "type": "number",
                              "sample": 2020
                            },
                            "month": {
                              "type": "number",
                              "sample": 4
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
                        "price": {
                          "type": "object",
                          "properties": {
                            "value": {
                              "type": "number",
                              "sample": 112000
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "Frac100"
                            }
                          }
                        },
                        "priceType": {
                          "type": "number",
                          "sample": 1
                        },
                        "unitCode": {
                          "type": "number",
                          "sample": 0
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "MhlwEquipment"
                        }
                      }
                    },
                    "purchasedEquipment": {
                      "type": "null"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "SearchMhlwEquipmentsResponse_EquipmentResource"
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
              "sample": "SearchMhlwEquipmentsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## SearchModifiers

**Hash**: `28a5e50225b6a0aa5f2a4708160f77e7ca4c4474a525eba1c3933b36b26fbb50`
**Endpoint**: `/graphql`

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
        "searchModifiers": {
          "type": "object",
          "properties": {
            "modifiers": {
              "type": "array",
              "length": 10,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "code": {
                      "type": "string",
                      "sample": "8070"
                    },
                    "name": {
                      "type": "string",
                      "sample": "０期"
                    },
                    "position": {
                      "type": "string",
                      "sample": "SUFFIX"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "MasterModifier"
                    }
                  }
                }
              ]
            },
            "nextPageToken": {
              "type": "string",
              "sample": "1"
            },
            "__typename": {
              "type": "string",
              "sample": "SearchModifiersResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## SearchPatients

**Hash**: `d3fee31f84425ec41a23b0e6c9315d369ead5161df4fef4771c10cff0f23c793`
**Endpoint**: `/graphql`

### Variables

```json
{
  "query": "string"
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
        "autocompletePatients": {
          "type": "object",
          "properties": {
            "patients": {
              "type": "array",
              "length": 100,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "30405ac6-a49d-4cf8-b2ac-ecf0b465e3fb"
                    },
                    "fullName": {
                      "type": "string",
                      "sample": "豊田 幸広"
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "Patient"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "AutocompletePatientsResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## SearchPrescriptionOrderTemplates

**Hash**: `3e6bbedb54b4a4d799421a145fcf06a5e78a54ed73e1b56f1d79c5362a26b726`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "pageSize": "number",
    "pageToken": "string",
    "searchDate": {
      "year": "number",
      "month": "number",
      "day": "number"
    },
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

## SearchSpecimenInspectionOrderTemplates

**Hash**: `20c657abd8a992de3ddd3446d2f40a6cb3278ed3269fb20062c3281b10ba3c98`
**Endpoint**: `/graphql`

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
        "searchSpecimenInspectionOrderTemplates": {
          "type": "object",
          "properties": {
            "specimenInspectionOrderTemplates": {
              "type": "array",
              "length": 45,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "93011bd3-cecb-4f84-be34-2d2d8e1d70ed"
                    },
                    "name": {
                      "type": "string",
                      "sample": "（Amy、T-Bil、D-Bil、ChE）"
                    },
                    "specimenInspectionOrderTemplateSpecimenInspections": {
                      "type": "array",
                      "length": 1,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "uuid": {
                              "type": "string",
                              "sample": "9bf2985c-205c-4fef-b3ea-1b4152414acd"
                            },
                            "specimenInspectionUuid": {
                              "type": "string",
                              "sample": "63e3df8d-99d3-4aae-8fcb-41e4f26d41b3"
                            },
                            "consultationDiagnoses": {
                              "type": "array",
                              "items": "empty"
                            },
                            "consultationEquipments": {
                              "type": "array",
                              "items": "empty"
                            },
                            "consultationMedicines": {
                              "type": "array",
                              "items": "empty"
                            },
                            "consultationOutsideInspections": {
                              "type": "array",
                              "length": 4,
                              "items": [
                                {
                                  "type": "object",
                                  "properties": {
                                    "uuid": {
                                      "type": "max_depth"
                                    },
                                    "isCalculatable": {
                                      "type": "max_depth"
                                    },
                                    "isFeeForService": {
                                      "type": "max_depth"
                                    },
                                    "masterOutsideInspection": {
                                      "type": "max_depth"
                                    },
                                    "outsideInspectionLaboratory": {
                                      "type": "max_depth"
                                    },
                                    "nonHealthcareSystemOutsideInspection": {
                                      "type": "max_depth"
                                    },
                                    "comments": {
                                      "type": "max_depth"
                                    },
                                    "specimenDiagnosis": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                }
                              ]
                            },
                            "note": {
                              "type": "string",
                              "sample": ""
                            },
                            "urgency": {
                              "type": "boolean",
                              "sample": false
                            },
                            "specimenInspection": {
                              "type": "object",
                              "properties": {
                                "uuid": {
                                  "type": "string",
                                  "sample": "63e3df8d-99d3-4aae-8fcb-41e4f26d41b3"
                                },
                                "name": {
                                  "type": "string",
                                  "sample": "四国中検"
                                },
                                "outsideInspectionLaboratory": {
                                  "type": "object",
                                  "properties": {
                                    "uuid": {
                                      "type": "max_depth"
                                    },
                                    "laboratoryName": {
                                      "type": "max_depth"
                                    },
                                    "outsideInspectionCompanyName": {
                                      "type": "max_depth"
                                    },
                                    "urgencySupported": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "outsideInspectionLaboratoryUuid": {
                                  "type": "object",
                                  "properties": {
                                    "value": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "codeTableItems": {
                                  "type": "array",
                                  "items": "empty"
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
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "SpecimenInspectionOrderTemplate_SpecimenInspection..."
                            }
                          }
                        }
                      ]
                    },
                    "note": {
                      "type": "string",
                      "sample": ""
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
                      "sample": "SpecimenInspectionOrderTemplate"
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
              "sample": "SearchSpecimenInspectionOrderTemplatesResponse"
            }
          }
        }
      }
    }
  }
}
```

---

## UpdateAccountingOrder

**Hash**: `1064078ed02f8dddd4a63d483f7b64a0e5a264d9a297d89ad4768222ffc0eb09`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "accountingOrder": {
      "uuid": "string",
      "encounterId": {
        "value": "string"
      },
      "patientUuid": "string",
      "doctorUuid": "string",
      "performDate": {
        "year": "number",
        "month": "number",
        "day": "number"
      },
      "revokeDescription": "string",
      "extendedInsuranceCombinationId": "null",
      "accountingInstructionGroups": [
        {
          "uuid": "string",
          "note": "string",
          "extendedShinryoShikibetsu": "string",
          "instructions": [
            "max_depth"
          ]
        }
      ],
      "saveAsDraft": "boolean"
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
        "updateAccountingOrder": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "cb5d3a3a-f13e-4963-b660-cfb3f1b153b4"
            },
            "patient": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "94b926dd-7a76-4981-bd86-2056f842e831"
                },
                "fullName": {
                  "type": "string",
                  "sample": "大西 和子"
                },
                "fullNamePhonetic": {
                  "type": "string",
                  "sample": "オオニシ カズコ"
                },
                "serialNumber": {
                  "type": "string",
                  "sample": "17821"
                },
                "detail": {
                  "type": "object",
                  "properties": {
                    "patientUuid": {
                      "type": "string",
                      "sample": "94b926dd-7a76-4981-bd86-2056f842e831"
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
                          "sample": 1931
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
                    "__typename": {
                      "type": "string",
                      "sample": "PatientDetail"
                    }
                  }
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
                "__typename": {
                  "type": "string",
                  "sample": "User"
                }
              }
            },
            "performDate": {
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
                  "sample": 10
                },
                "__typename": {
                  "type": "string",
                  "sample": "Date"
                }
              }
            },
            "orderStatus": {
              "type": "string",
              "sample": "ORDER_STATUS_ON_HOLD"
            },
            "revokeDescription": {
              "type": "string",
              "sample": ""
            },
            "accountingInstructionGroups": {
              "type": "array",
              "length": 1,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "eddb4b04-3692-4557-9586-682544a4906e"
                    },
                    "note": {
                      "type": "string",
                      "sample": ""
                    },
                    "extendedShinryoShikibetsu": {
                      "type": "string",
                      "sample": "EXTENDED_SHINRYO_SHIKIBETSU_SHOCHI"
                    },
                    "instructions": {
                      "type": "array",
                      "length": 1,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "diagnosisInstruction": {
                              "type": "object",
                              "properties": {
                                "uuid": {
                                  "type": "string",
                                  "sample": "96f44673-8898-42b4-9df7-c3e79b02157d"
                                },
                                "mhlwDiagnosis": {
                                  "type": "object",
                                  "properties": {
                                    "id": {
                                      "type": "max_depth"
                                    },
                                    "code": {
                                      "type": "max_depth"
                                    },
                                    "name": {
                                      "type": "max_depth"
                                    },
                                    "unitCode": {
                                      "type": "max_depth"
                                    },
                                    "pointType": {
                                      "type": "max_depth"
                                    },
                                    "point": {
                                      "type": "max_depth"
                                    },
                                    "isStepValueRequiredForCalculation": {
                                      "type": "max_depth"
                                    },
                                    "stepValue": {
                                      "type": "max_depth"
                                    },
                                    "isDiminishing": {
                                      "type": "max_depth"
                                    },
                                    "startDate": {
                                      "type": "max_depth"
                                    },
                                    "endDate": {
                                      "type": "max_depth"
                                    },
                                    "applicableShinryoShikibetsuCodes": {
                                      "type": "max_depth"
                                    },
                                    "isInpatientUsable": {
                                      "type": "max_depth"
                                    },
                                    "isOutpatientUsable": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "quantity": {
                                  "type": "null"
                                },
                                "isAccountingIgnored": {
                                  "type": "boolean",
                                  "sample": false
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "DiagnosisInstruction"
                                }
                              }
                            },
                            "medicationDosageInstruction": {
                              "type": "null"
                            },
                            "equipmentInstruction": {
                              "type": "null"
                            },
                            "receiptComment": {
                              "type": "null"
                            },
                            "medicationUsageComment": {
                              "type": "null"
                            },
                            "nonHealthcareSystemInstruction": {
                              "type": "null"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "AccountingInstructionGroup_AccountingInstruction"
                            }
                          }
                        }
                      ]
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "AccountingInstructionGroup"
                    }
                  }
                }
              ]
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
                  "sample": 1768027234
                },
                "nanos": {
                  "type": "number",
                  "sample": 248872000
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
                  "sample": 1768027301
                },
                "nanos": {
                  "type": "number",
                  "sample": 954082153
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "encounterId": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "9e7f0ff2-7255-40eb-ba15-3856a4ff12cf"
                },
                "__typename": {
                  "type": "string",
                  "sample": "StringValue"
                }
              }
            },
            "extendedInsuranceCombinationId": {
              "type": "null"
            },
            "isDraft": {
              "type": "boolean",
              "sample": true
            },
            "isOutpatient": {
              "type": "boolean",
              "sample": true
            },
            "__typename": {
              "type": "string",
              "sample": "AccountingOrder"
            }
          }
        }
      }
    }
  }
}
```

---

## UpdateAccountingOrderTemplate

**Hash**: `0437d96b877b85bad15d5104b6ec384825ea19412ec5408a54045dc1543dbad9`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "accountingOrderTemplates": {
      "uuid": "string",
      "name": "string",
      "accountingInstructionGroups": [
        {
          "uuid": "string",
          "note": "string",
          "extendedShinryoShikibetsu": "string",
          "instructions": [
            "max_depth"
          ]
        }
      ],
      "startDate": "null",
      "endDate": "null",
      "encounterTemplateId": {
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
        "updateAccountingOrderTemplate": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "8ab98cea-8d81-464f-8842-448c773923a8"
            },
            "name": {
              "type": "string",
              "sample": ""
            },
            "startDate": {
              "type": "null"
            },
            "endDate": {
              "type": "null"
            },
            "encounterTemplateId": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "577861aa-e1ef-475f-ba97-c2b94b7c130f"
                },
                "__typename": {
                  "type": "string",
                  "sample": "StringValue"
                }
              }
            },
            "accountingInstructionGroups": {
              "type": "array",
              "length": 1,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "3eb9da6c-338e-4bbd-823c-5f475ecc1b2c"
                    },
                    "note": {
                      "type": "string",
                      "sample": ""
                    },
                    "extendedShinryoShikibetsu": {
                      "type": "string",
                      "sample": "EXTENDED_SHINRYO_SHIKIBETSU_SHOCHI"
                    },
                    "instructions": {
                      "type": "array",
                      "length": 3,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "diagnosisInstruction": {
                              "type": "object",
                              "properties": {
                                "uuid": {
                                  "type": "string",
                                  "sample": "a58b0e66-910f-440a-8cb3-b83a2d318fa9"
                                },
                                "mhlwDiagnosis": {
                                  "type": "object",
                                  "properties": {
                                    "id": {
                                      "type": "max_depth"
                                    },
                                    "code": {
                                      "type": "max_depth"
                                    },
                                    "name": {
                                      "type": "max_depth"
                                    },
                                    "unitCode": {
                                      "type": "max_depth"
                                    },
                                    "pointType": {
                                      "type": "max_depth"
                                    },
                                    "point": {
                                      "type": "max_depth"
                                    },
                                    "isStepValueRequiredForCalculation": {
                                      "type": "max_depth"
                                    },
                                    "stepValue": {
                                      "type": "max_depth"
                                    },
                                    "isDiminishing": {
                                      "type": "max_depth"
                                    },
                                    "startDate": {
                                      "type": "max_depth"
                                    },
                                    "endDate": {
                                      "type": "max_depth"
                                    },
                                    "applicableShinryoShikibetsuCodes": {
                                      "type": "max_depth"
                                    },
                                    "isInpatientUsable": {
                                      "type": "max_depth"
                                    },
                                    "isOutpatientUsable": {
                                      "type": "max_depth"
                                    },
                                    "__typename": {
                                      "type": "max_depth"
                                    }
                                  }
                                },
                                "quantity": {
                                  "type": "null"
                                },
                                "isAccountingIgnored": {
                                  "type": "boolean",
                                  "sample": false
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "DiagnosisInstruction"
                                }
                              }
                            },
                            "medicationDosageInstruction": {
                              "type": "null"
                            },
                            "equipmentInstruction": {
                              "type": "null"
                            },
                            "receiptComment": {
                              "type": "null"
                            },
                            "medicationUsageComment": {
                              "type": "null"
                            },
                            "nonHealthcareSystemInstruction": {
                              "type": "null"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "AccountingInstructionGroup_AccountingInstruction"
                            }
                          }
                        }
                      ]
                    },
                    "__typename": {
                      "type": "string",
                      "sample": "AccountingInstructionGroup"
                    }
                  }
                }
              ]
            },
            "createTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1765280058
                },
                "nanos": {
                  "type": "number",
                  "sample": 533912000
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
                  "sample": 1768105502
                },
                "nanos": {
                  "type": "number",
                  "sample": 876925811
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
            },
            "__typename": {
              "type": "string",
              "sample": "AccountingOrderTemplate"
            }
          }
        }
      }
    }
  }
}
```

---

## UpdateImagingOrderTemplate

**Hash**: `0e185f03d2c7080ffbe45288bdfca1e81552657234577e2ae09af87e86749bad`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "imagingOrderTemplate": {
      "uuid": "string",
      "name": "string",
      "note": "string",
      "startDate": "null",
      "endDate": "null",
      "imagingModality": "string",
      "encounterTemplateId": "null",
      "condition": {
        "plainRadiographyDigital": {
          "series": [
            "max_depth"
          ]
        }
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
        "updateImagingOrderTemplate": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "dfa729a6-441d-44b7-b25d-443be97665ab"
            },
            "name": {
              "type": "string",
              "sample": "☆XP / 上肢 / 4 環指"
            },
            "imagingModality": {
              "type": "string",
              "sample": "IMAGING_MODALITY_PLAIN_RADIOGRAPHY_DIGITAL"
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
                  "sample": 1767009519
                },
                "nanos": {
                  "type": "number",
                  "sample": 951012000
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
                              "sample": "527ab1a1-da7a-4ad8-a0d0-5a9645922110"
                            },
                            "uuid": {
                              "type": "string",
                              "sample": "63fbf3b4-47b8-4f86-b169-bbbda186983a"
                            },
                            "bodyPositions": {
                              "type": "array",
                              "length": 1,
                              "items": [
                                {
                                  "type": "string",
                                  "sample": "BODY_POSITION_ANY"
                                }
                              ]
                            },
                            "filmCount": {
                              "type": "null"
                            },
                            "configuration": {
                              "type": "string",
                              "sample": "56kVp,10mAs,110cm"
                            },
                            "note": {
                              "type": "string",
                              "sample": "環指"
                            },
                            "laterality": {
                              "type": "string",
                              "sample": "LATERALITY_NONE"
                            },
                            "bodySite": {
                              "type": "object",
                              "properties": {
                                "uuid": {
                                  "type": "string",
                                  "sample": "527ab1a1-da7a-4ad8-a0d0-5a9645922110"
                                },
                                "name": {
                                  "type": "string",
                                  "sample": "手指"
                                },
                                "lateralityRequirement": {
                                  "type": "boolean",
                                  "sample": true
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "LocalBodySite"
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
      }
    }
  }
}
```

---

## UpdateInjectionOrderTemplate

**Hash**: `844779e954c6afef4a9c6daf25cb214ae212d8a7a4ca12e0b858080fbc5cffc8`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "injectionOrderTemplate": {
      "uuid": "string",
      "name": "string",
      "medicationCategory": "string",
      "note": "string",
      "rps": [
        {
          "uuid": "string",
          "boundsDurationDays": {
            "value": "max_depth"
          },
          "dosageRate": {
            "rateQuantityHour": "max_depth",
            "rateQuantityMinute": "max_depth",
            "rateQuantitySecond": "max_depth",
            "rateQuantityPerHour": "max_depth",
            "rateQuantityPerMinute": "max_depth",
            "rateQuantityPerSecond": "max_depth"
          },
          "instructions": [
            "max_depth"
          ],
          "isBringing": "boolean",
          "isWardStock": "boolean",
          "dosageText": "string",
          "localInjectionTechniqueUuid": {
            "value": "max_depth"
          },
          "medicationTiming": {
            "medicationTiming": "max_depth"
          },
          "slidingScaleEnabled": "boolean"
        }
      ],
      "startDate": "null",
      "endDate": "null",
      "encounterTemplateId": {
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
        "updateInjectionOrderTemplate": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "77cd2b3d-3e75-493d-89cc-800439d042fb"
            },
            "name": {
              "type": "string",
              "sample": ""
            },
            "medicationCategory": {
              "type": "string",
              "sample": "MEDICATION_CATEGORY_UNSPECIFIED"
            },
            "note": {
              "type": "string",
              "sample": ""
            },
            "startDate": {
              "type": "null"
            },
            "endDate": {
              "type": "null"
            },
            "createTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1768136905
                },
                "nanos": {
                  "type": "number",
                  "sample": 966901000
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
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
                      "sample": "90ef21e6-6605-4fa8-9858-32f6f071bfb3"
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
                    "boundsDurationDays": {
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
                          "type": "null"
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
                          "sample": "013dfdc0-2893-4da9-b221-86e7f0fe9986"
                        },
                        "name": {
                          "type": "string",
                          "sample": "関節腔内注射"
                        },
                        "masterId": {
                          "type": "string",
                          "sample": "1_10"
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
                          "sample": "013dfdc0-2893-4da9-b221-86e7f0fe9986"
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "StringValue"
                        }
                      }
                    },
                    "instructions": {
                      "type": "array",
                      "length": 2,
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
            "encounterTemplateId": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "dca65673-2768-42ae-89a5-df8c1957ad8c"
                },
                "__typename": {
                  "type": "string",
                  "sample": "StringValue"
                }
              }
            },
            "__typename": {
              "type": "string",
              "sample": "InjectionOrderTemplate"
            }
          }
        }
      }
    }
  }
}
```

---

## UpdateMultiPatientReceiptDiseases

**Hash**: `21193b6c4c2286cdfda4fe8017d02ac9dd501322c13f7665ddd0e9afda745f62`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "records": [
      {
        "recordOperation": "string",
        "patientReceiptDisease": {
          "patientUuid": "string",
          "uuid": "string",
          "masterDiseaseCode": "string",
          "isMain": "boolean",
          "isSuspected": "boolean",
          "excludeReceipt": "boolean",
          "masterModifierCodes": [
            "max_depth"
          ],
          "startDate": {
            "year": "max_depth",
            "month": "max_depth",
            "day": "max_depth"
          },
          "outcome": "string",
          "endDate": "null",
          "customDiseaseName": "null",
          "intractableDiseaseType": "string",
          "patientCareType": "string"
        }
      }
    ]
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
        "updateMultiPatientReceiptDiseases": {
          "type": "object",
          "properties": {
            "patientReceiptDiseases": {
              "type": "array",
              "length": 1,
              "items": [
                {
                  "type": "object",
                  "properties": {
                    "uuid": {
                      "type": "string",
                      "sample": "1c38b3e8-d6ee-4a3f-a11c-a3cc56fad3e4"
                    },
                    "patientUuid": {
                      "type": "string",
                      "sample": "5dec3bfe-ad39-41ac-a8f9-ddaa800ffbc0"
                    },
                    "masterDiseaseCode": {
                      "type": "string",
                      "sample": "8837618"
                    },
                    "masterModifierCodes": {
                      "type": "array",
                      "length": 2,
                      "items": [
                        {
                          "type": "string",
                          "sample": "7274"
                        }
                      ]
                    },
                    "isMain": {
                      "type": "boolean",
                      "sample": false
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
                          "sample": 2026
                        },
                        "month": {
                          "type": "number",
                          "sample": 1
                        },
                        "day": {
                          "type": "number",
                          "sample": 10
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
                          "sample": "8837618"
                        },
                        "name": {
                          "type": "string",
                          "sample": "中足趾節関節捻挫"
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
                              "sample": "S935"
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
                      "length": 2,
                      "items": [
                        {
                          "type": "object",
                          "properties": {
                            "code": {
                              "type": "string",
                              "sample": "7274"
                            },
                            "name": {
                              "type": "string",
                              "sample": "母趾"
                            },
                            "position": {
                              "type": "string",
                              "sample": "PREFIX"
                            },
                            "__typename": {
                              "type": "string",
                              "sample": "MasterModifier"
                            }
                          }
                        }
                      ]
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
                    "createTime": {
                      "type": "object",
                      "properties": {
                        "seconds": {
                          "type": "number",
                          "sample": 1768025909
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 324173000
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
                          "sample": 1768025909
                        },
                        "nanos": {
                          "type": "number",
                          "sample": 324173000
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
                          "sample": "5dec3bfe-ad39-41ac-a8f9-ddaa800ffbc0"
                        },
                        "serialNumber": {
                          "type": "string",
                          "sample": "20216"
                        },
                        "serialNumberPrefix": {
                          "type": "string",
                          "sample": ""
                        },
                        "fullName": {
                          "type": "string",
                          "sample": "辻 絵理佳"
                        },
                        "fullNamePhonetic": {
                          "type": "string",
                          "sample": "ツジ エリカ"
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
                              "sample": "5dec3bfe-ad39-41ac-a8f9-ddaa800ffbc0"
                            },
                            "addressLine_1": {
                              "type": "string",
                              "sample": "高松市 丸の内 6番26‐502号アルファステイツ丸の内"
                            },
                            "addressLine_2": {
                              "type": "string",
                              "sample": ""
                            },
                            "postalCode": {
                              "type": "string",
                              "sample": "7600033"
                            },
                            "email": {
                              "type": "string",
                              "sample": ""
                            },
                            "phoneNumber": {
                              "type": "string",
                              "sample": "08029941851"
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
                                  "sample": 1984
                                },
                                "month": {
                                  "type": "number",
                                  "sample": 4
                                },
                                "day": {
                                  "type": "number",
                                  "sample": 3
                                },
                                "__typename": {
                                  "type": "string",
                                  "sample": "Date"
                                }
                              }
                            },
                            "memo": {
                              "type": "string",
                              "sample": "医療情報取得加算(初)08年01月"
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
                    "__typename": {
                      "type": "string",
                      "sample": "PatientReceiptDisease"
                    }
                  }
                }
              ]
            },
            "__typename": {
              "type": "string",
              "sample": "UpdateMultiPatientReceiptDiseasesResponse"
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
**Endpoint**: `/graphql`

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

## UpdatePrescriptionOrder

**Hash**: `b56aec755e6c7aef1c80fabe489bc26df79961796e0f043e9f3a8d315afb3d6c`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "prescriptionOrder": {
      "uuid": "string",
      "patientUuid": "string",
      "doctorUuid": "string",
      "medicationCategory": "string",
      "startDate": {
        "year": "number",
        "month": "number",
        "day": "number"
      },
      "note": "string",
      "revokeDescription": "string",
      "rps": [
        {
          "uuid": "string",
          "asNeeded": "boolean",
          "boundsDurationDays": {
            "value": "max_depth"
          },
          "dosageFormType": "number",
          "expectedRepeatCount": "null",
          "instructions": [
            "max_depth"
          ],
          "isBringing": "boolean",
          "isWardStock": "boolean",
          "dosageText": "string",
          "localInjectionTechniqueUuid": "null",
          "medicationTiming": {
            "medicationTiming": "max_depth"
          },
          "slidingScaleEnabled": "boolean"
        }
      ],
      "encounterId": {
        "value": "string"
      },
      "saveAsDraft": "boolean",
      "extendedInsuranceCombinationId": "null"
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
        "updatePrescriptionOrder": {
          "type": "object",
          "properties": {
            "createTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1768021764
                },
                "nanos": {
                  "type": "number",
                  "sample": 580182000
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
              "sample": "MEDICATION_CATEGORY_OUT_OF_HOSPITAL"
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
              "sample": "ORDER_STATUS_ON_HOLD"
            },
            "patient": {
              "type": "object",
              "properties": {
                "uuid": {
                  "type": "string",
                  "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
                },
                "serialNumber": {
                  "type": "string",
                  "sample": "16581"
                },
                "serialNumberPrefix": {
                  "type": "string",
                  "sample": ""
                },
                "fullName": {
                  "type": "string",
                  "sample": "大平 逸郎"
                },
                "fullNamePhonetic": {
                  "type": "string",
                  "sample": "オオヒラ イツロウ"
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
                      "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
                    },
                    "addressLine_1": {
                      "type": "string",
                      "sample": "高松市 高松町78番地10プレジデント屋島304"
                    },
                    "addressLine_2": {
                      "type": "string",
                      "sample": ""
                    },
                    "postalCode": {
                      "type": "string",
                      "sample": "7610104"
                    },
                    "email": {
                      "type": "string",
                      "sample": ""
                    },
                    "phoneNumber": {
                      "type": "string",
                      "sample": "843-6172"
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
                          "sample": 1961
                        },
                        "month": {
                          "type": "number",
                          "sample": 4
                        },
                        "day": {
                          "type": "number",
                          "sample": 19
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Date"
                        }
                      }
                    },
                    "memo": {
                      "type": "string",
                      "sample": "TEL:09031830046\n 医療情報取得加算(再)07年12月\n一包化処方"
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
            "patientUuid": {
              "type": "string",
              "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
            },
            "revokeDescription": {
              "type": "string",
              "sample": ""
            },
            "rps": {
              "type": "array",
              "length": 4,
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
                      "sample": "毎週木曜日、MTX4mg/w          　　"
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
                          "sample": 2
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
                      "sample": "b0a8dfea-b0c5-4ebb-af12-9f2f14531ea6"
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
                  "sample": 2026
                },
                "month": {
                  "type": "number",
                  "sample": 1
                },
                "day": {
                  "type": "number",
                  "sample": 10
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
                  "sample": 1768021952
                },
                "nanos": {
                  "type": "number",
                  "sample": 714434379
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
              "sample": "501f1220-9456-45bd-98e8-9576a0372ea1"
            },
            "encounterId": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "e9504d33-4c9a-4175-a65f-1417b8f9a23d"
                },
                "__typename": {
                  "type": "string",
                  "sample": "StringValue"
                }
              }
            },
            "extendedInsuranceCombinationId": {
              "type": "null"
            },
            "isDraft": {
              "type": "boolean",
              "sample": true
            },
            "isOutpatient": {
              "type": "boolean",
              "sample": true
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

## UpdatePrescriptionOrderTemplate

**Hash**: `8e57fe4cc3f4adf0bb9b09379fd312f3343db4cc2cfc0d92b8feb69e1445760a`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "prescriptionOrderTemplate": {
      "uuid": "string",
      "name": "string",
      "medicationCategory": "string",
      "note": "string",
      "rps": [
        {
          "uuid": "string",
          "asNeeded": "boolean",
          "boundsDurationDays": {
            "value": "max_depth"
          },
          "dosageFormType": "number",
          "expectedRepeatCount": "null",
          "instructions": [
            "max_depth"
          ],
          "isBringing": "boolean",
          "isWardStock": "boolean",
          "dosageText": "string",
          "localInjectionTechniqueUuid": "null",
          "medicationTiming": {
            "medicationTiming": "max_depth"
          },
          "slidingScaleEnabled": "boolean"
        }
      ],
      "startDate": "null",
      "endDate": "null",
      "encounterTemplateId": {
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
        "updatePrescriptionOrderTemplate": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "64d5d036-a91c-4dfb-88c1-9e7a9f2081c7"
            },
            "name": {
              "type": "string",
              "sample": ""
            },
            "medicationCategory": {
              "type": "string",
              "sample": "MEDICATION_CATEGORY_OUT_OF_HOSPITAL"
            },
            "note": {
              "type": "string",
              "sample": ""
            },
            "startDate": {
              "type": "null"
            },
            "endDate": {
              "type": "null"
            },
            "createTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1768097941
                },
                "nanos": {
                  "type": "number",
                  "sample": 961508000
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
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
                                  "sample": "65e71499-a4cf-42b5-ac63-07e4abab35ff"
                                },
                                "text": {
                                  "type": "string",
                                  "sample": "１日３回朝昼夕食後"
                                },
                                "useAsNeeded": {
                                  "type": "boolean",
                                  "sample": false
                                },
                                "timings": {
                                  "type": "array",
                                  "length": 3,
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
                                  "sample": "65e71499-a4cf-42b5-ac63-07e4abab35ff"
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
                          "sample": 14
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
                      "length": 2,
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
                      "sample": "5606e0bb-a5c6-4b7f-8596-44476ec10af8"
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
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "34716b45-0f71-4576-b6a5-43158ea093f8"
                },
                "__typename": {
                  "type": "string",
                  "sample": "StringValue"
                }
              }
            },
            "__typename": {
              "type": "string",
              "sample": "PrescriptionOrderTemplate"
            }
          }
        }
      }
    }
  }
}
```

---

## UpdateSession

**Hash**: `78402e51c96980494ff9fa38d1b22c6939f9b654fcb6867dd2d288351bc632f3`
**Endpoint**: `/graphql`

### Variables

```json
{
  "input": {
    "session": {
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
        "updateSession": {
          "type": "object",
          "properties": {
            "uuid": {
              "type": "string",
              "sample": "9408b544-d18b-49f5-ab96-89941d25548b"
            },
            "patientUuid": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
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
              "sample": "CONSULTATION_STARTED"
            },
            "stateChangeTime": {
              "type": "object",
              "properties": {
                "seconds": {
                  "type": "number",
                  "sample": 1768022082
                },
                "nanos": {
                  "type": "number",
                  "sample": 731822000
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
                  "sample": 1768021104
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
                  "sample": 1768021125
                },
                "nanos": {
                  "type": "number",
                  "sample": 600299000
                },
                "__typename": {
                  "type": "string",
                  "sample": "Timestamp"
                }
              }
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
                  "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
                },
                "serialNumber": {
                  "type": "string",
                  "sample": "16581"
                },
                "serialNumberPrefix": {
                  "type": "string",
                  "sample": ""
                },
                "fullName": {
                  "type": "string",
                  "sample": "大平 逸郎"
                },
                "fullNamePhonetic": {
                  "type": "string",
                  "sample": "オオヒラ イツロウ"
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
                      "sample": "011540de-4582-46ab-aed3-ec24d3c981dd"
                    },
                    "addressLine_1": {
                      "type": "string",
                      "sample": "高松市 高松町78番地10プレジデント屋島304"
                    },
                    "addressLine_2": {
                      "type": "string",
                      "sample": ""
                    },
                    "postalCode": {
                      "type": "string",
                      "sample": "7610104"
                    },
                    "email": {
                      "type": "string",
                      "sample": ""
                    },
                    "phoneNumber": {
                      "type": "string",
                      "sample": "843-6172"
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
                          "sample": 1961
                        },
                        "month": {
                          "type": "number",
                          "sample": 4
                        },
                        "day": {
                          "type": "number",
                          "sample": 19
                        },
                        "__typename": {
                          "type": "string",
                          "sample": "Date"
                        }
                      }
                    },
                    "memo": {
                      "type": "string",
                      "sample": "TEL:09031830046\n 医療情報取得加算(再)07年12月\n一包化処方"
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
                  "sample": "e9504d33-4c9a-4175-a65f-1417b8f9a23d"
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
