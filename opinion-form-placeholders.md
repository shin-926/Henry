# 主治医意見書 Googleドキュメント プレースホルダー一覧

このドキュメントは、Googleドキュメントテンプレート内で使用するプレースホルダーの一覧です。

## 使用方法

Googleドキュメント内に以下の形式でプレースホルダーを配置してください：
```
{{患者名}}
```

スクリプトが自動的に実データに置き換えます。

---

## 1. 基本情報（basic_info）

| プレースホルダー | JSONキー | 項番 |
|----------------|---------|------|
| `{{記入日}}` | `basic_info.date_of_writing` | 14 |
| `{{患者名かな}}` | `basic_info.patient_name_kana` | 15 |
| `{{患者名}}` | `basic_info.patient_name` | 16 |
| `{{生年月日}}` | `basic_info.birth_date` | 17 |
| `{{年齢}}` | `basic_info.age` | 18 |
| `{{性別}}` | `basic_info.sex` | 19 |
| `{{郵便番号}}` | `basic_info.postal_code` | 20 |
| `{{住所}}` | `basic_info.address` | 21 |
| `{{連絡先電話番号}}` | `basic_info.phone` | 22 |
| `{{医師氏名}}` | `basic_info.physician_name` | 23 |
| `{{医療機関名}}` | `basic_info.institution_name` | 24 |
| `{{医療機関郵便番号}}` | `basic_info.institution_postal_code` | 25 |
| `{{医療機関所在地}}` | `basic_info.institution_address` | 26 |
| `{{医療機関電話番号}}` | `basic_info.institution_phone` | 27 |
| `{{医療機関FAX番号}}` | `basic_info.institution_fax` | 28 |
| `{{同意の有無}}` | `basic_info.consent` | 29 |
| `{{最終診察日}}` | `basic_info.last_examination_date` | 30 |
| `{{意見書作成回数}}` | `basic_info.opinion_count` | 31 |
| `{{他科受診有無}}` | `basic_info.other_department_visit` | 32 |

---

## 2. 傷病に関する意見（diagnosis）

| プレースホルダー | JSONキー | 項番 |
|----------------|---------|------|
| `{{他科名}}` | `diagnosis.other_departments` | 33 |
| `{{その他の他科名}}` | `diagnosis.other_department_names` | 34 |
| `{{診断名1}}` | `diagnosis.diagnosis_1_name` | 35 |
| `{{発症年月日1}}` | `diagnosis.diagnosis_1_onset` | 36 |
| `{{診断名2}}` | `diagnosis.diagnosis_2_name` | 37 |
| `{{発症年月日2}}` | `diagnosis.diagnosis_2_onset` | 38 |
| `{{診断名3}}` | `diagnosis.diagnosis_3_name` | 39 |
| `{{発症年月日3}}` | `diagnosis.diagnosis_3_onset` | 40 |
| `{{症状安定性}}` | `diagnosis.symptom_stability` | 41 |
| `{{症状不安定時の具体的状況}}` | `diagnosis.symptom_unstable_details` | 42 |
| `{{経過及び治療内容}}` | `diagnosis.course_and_treatment` | 43 |

---

## 3. 特別な医療（special_medical_care）

| プレースホルダー | JSONキー | 項番 |
|----------------|---------|------|
| `{{処置内容}}` | `special_medical_care.treatments` | 44 |
| `{{特別な対応}}` | `special_medical_care.special_responses` | 45 |
| `{{失禁への対応}}` | `special_medical_care.incontinence_care` | 46 |

---

## 4. 心身の状態（mental_physical_state）

| プレースホルダー | JSONキー | 項番 |
|----------------|---------|------|
| `{{寝たきり度}}` | `mental_physical_state.bedridden_level` | 47 |
| `{{認知症高齢者の日常生活自立度}}` | `mental_physical_state.dementia_level` | 48 |
| `{{短期記憶}}` | `mental_physical_state.short_term_memory` | 49 |
| `{{認知能力}}` | `mental_physical_state.cognitive_ability` | 50 |
| `{{伝達能力}}` | `mental_physical_state.communication_ability` | 51 |
| `{{周辺症状有無}}` | `mental_physical_state.peripheral_symptoms` | 52 |
| `{{周辺症状詳細}}` | `mental_physical_state.peripheral_symptoms_details` | 53 |
| `{{その他の周辺症状}}` | `mental_physical_state.other_peripheral_symptoms` | 54 |
| `{{精神神経症状有無}}` | `mental_physical_state.psychiatric_symptoms` | 55 |
| `{{精神神経症状名}}` | `mental_physical_state.psychiatric_symptom_name` | 56 |
| `{{専門医受診有無}}` | `mental_physical_state.specialist_visit` | 57 |
| `{{専門医受診科名}}` | `mental_physical_state.specialist_department` | 58 |
| `{{利き腕}}` | `mental_physical_state.dominant_hand` | 59 |
| `{{身長}}` | `mental_physical_state.height` | 60 |
| `{{体重}}` | `mental_physical_state.weight` | 61 |
| `{{体重の変化}}` | `mental_physical_state.weight_change` | 62 |
| `{{四肢欠損}}` | `mental_physical_state.limb_loss` | 63 |
| `{{四肢欠損部位}}` | `mental_physical_state.limb_loss_location` | 64 |
| `{{麻痺}}` | `mental_physical_state.paralysis` | 65 |
| `{{麻痺右上肢}}` | `mental_physical_state.paralysis_right_upper_limb` | 66 |
| `{{麻痺右上肢程度}}` | `mental_physical_state.paralysis_right_upper_limb_severity` | 67 |
| `{{麻痺左上肢}}` | `mental_physical_state.paralysis_left_upper_limb` | 68 |
| `{{麻痺左上肢程度}}` | `mental_physical_state.paralysis_left_upper_limb_severity` | 69 |
| `{{麻痺右下肢}}` | `mental_physical_state.paralysis_right_lower_limb` | 70 |
| `{{麻痺右下肢程度}}` | `mental_physical_state.paralysis_right_lower_limb_severity` | 71 |
| `{{麻痺左下肢}}` | `mental_physical_state.paralysis_left_lower_limb` | 72 |
| `{{麻痺左下肢程度}}` | `mental_physical_state.paralysis_left_lower_limb_severity` | 73 |
| `{{麻痺その他}}` | `mental_physical_state.paralysis_other` | 74 |
| `{{麻痺その他部位}}` | `mental_physical_state.paralysis_other_location` | 75 |
| `{{麻痺その他程度}}` | `mental_physical_state.paralysis_other_severity` | 76 |
| `{{筋力低下}}` | `mental_physical_state.muscle_weakness` | 77 |
| `{{筋力低下部位}}` | `mental_physical_state.muscle_weakness_location` | 78 |
| `{{筋力低下程度}}` | `mental_physical_state.muscle_weakness_severity` | 79 |
| `{{関節拘縮}}` | `mental_physical_state.joint_contracture` | 80 |
| `{{関節拘縮部位}}` | `mental_physical_state.joint_contracture_location` | 81 |
| `{{関節拘縮程度}}` | `mental_physical_state.joint_contracture_severity` | 82 |
| `{{関節痛み}}` | `mental_physical_state.joint_pain` | 83 |
| `{{関節痛み部位}}` | `mental_physical_state.joint_pain_location` | 84 |
| `{{関節痛み程度}}` | `mental_physical_state.joint_pain_severity` | 85 |
| `{{失調不随意運動}}` | `mental_physical_state.ataxia_involuntary_movement` | 86 |
| `{{失調不随意運動上肢}}` | `mental_physical_state.ataxia_upper_limbs` | 87 |
| `{{失調不随意運動下肢}}` | `mental_physical_state.ataxia_lower_limbs` | 88 |
| `{{体幹}}` | `mental_physical_state.trunk` | 89 |
| `{{褥瘡}}` | `mental_physical_state.pressure_ulcer` | 90 |
| `{{褥瘡部位}}` | `mental_physical_state.pressure_ulcer_location` | 91 |
| `{{褥瘡程度}}` | `mental_physical_state.pressure_ulcer_severity` | 92 |
| `{{その他皮膚疾患}}` | `mental_physical_state.other_skin_disease` | 93 |
| `{{その他皮膚疾患部位}}` | `mental_physical_state.other_skin_disease_location` | 94 |
| `{{その他皮膚疾患程度}}` | `mental_physical_state.other_skin_disease_severity` | 95 |

---

## 5. 生活機能とサービス（life_function）

| プレースホルダー | JSONキー | 項番 |
|----------------|---------|------|
| `{{屋外歩行}}` | `life_function.outdoor_walking` | 96 |
| `{{車いすの使用}}` | `life_function.wheelchair_use` | 97 |
| `{{歩行補助具・装具の使用}}` | `life_function.walking_aids` | 98 |
| `{{食事行為}}` | `life_function.eating_behavior` | 99 |
| `{{現在の栄養状態}}` | `life_function.current_nutrition_status` | 100 |
| `{{栄養・食生活上の留意点}}` | `life_function.nutrition_diet_notes` | 101 |
| `{{発生可能性状態}}` | `life_function.possible_conditions` | 102 |
| `{{その他の状態名}}` | `life_function.other_condition_name` | 103 |
| `{{対処方針内容}}` | `life_function.response_policy` | 104 |
| `{{生活機能改善見通し}}` | `life_function.life_function_improvement_outlook` | 105 |
| `{{医学的管理の必要性}}` | `life_function.medical_management_necessity` | 106 |
| `{{その他の医学的管理}}` | `life_function.other_medical_management` | 107 |
| `{{サービス提供血圧}}` | `life_function.service_blood_pressure` | 108 |
| `{{サービス提供血圧留意事項}}` | `life_function.service_blood_pressure_notes` | 109 |
| `{{サービス提供摂食}}` | `life_function.service_eating` | 110 |
| `{{サービス提供摂食留意事項}}` | `life_function.service_eating_notes` | 111 |
| `{{サービス提供嚥下}}` | `life_function.service_swallowing` | 112 |
| `{{サービス提供嚥下留意事項}}` | `life_function.service_swallowing_notes` | 113 |
| `{{サービス提供移動}}` | `life_function.service_mobility` | 114 |
| `{{サービス提供移動留意事項}}` | `life_function.service_mobility_notes` | 115 |
| `{{サービス提供運動}}` | `life_function.service_exercise` | 116 |
| `{{サービス提供運動留意事項}}` | `life_function.service_exercise_notes` | 117 |
| `{{サービス提供その他の留意事項}}` | `life_function.service_other_notes` | 119 |
| `{{感染症有無}}` | `life_function.infection` | 121 |
| `{{感染症名}}` | `life_function.infection_name` | 122 |

---

## 6. 特記事項（special_notes）

| プレースホルダー | JSONキー | 項番 |
|----------------|---------|------|
| `{{その他特記事項}}` | `special_notes.other_notes` | 123 |

---

## 総計

**全108項目のプレースホルダー**

---

## 注意事項

1. **ビットフラグ項目**: 複数選択項目は、左から順に0または1で表現されます
   - 例: `{{他科名}}` = `"1111110000001"` → 内科、精神科、外科、整形外科、脳神経外科、皮膚科、泌尿器科が選択

2. **日付フォーマット**: YYYYMMDD形式（例: `"19991020"`）

3. **選択肢項目**: 数値コードで表現されます
   - 例: `{{性別}}` = `"1"` → 男性

4. **自動入力項目**:
   - 患者情報（氏名、生年月日等）は HenryCore API から自動取得
   - 医師情報（氏名、医療機関等）はログインユーザー情報から自動取得
