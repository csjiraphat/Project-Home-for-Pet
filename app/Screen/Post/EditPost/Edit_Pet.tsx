// ✅ Edit_Pet.tsx — update via PUT (JSON), แล้วรี-แมตช์อัตโนมัติ (save=1&overwrite=1)
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert, ScrollView, StyleSheet, SafeAreaView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AgeSelector from '../../../../components/AgeSelector';
import { parseThaiAge, monthsToY, monthsToM, yMtoMonths, monthsToString } from '../../../utils/age';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import API from '../../../../android/app/src/config';

type Option = { id: number; label: string };

// -------- Master API helpers --------
const MASTER_READ = (API as any).MASTER_READ || `${(API as any).BASE_URL || ''}/post/master_read_api.php`;
const buildQuery = (params: Record<string, any> = {}) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
const speciesCode = (type: string) => (type === 'หมา' ? 'dog' : 'cat');
const fetchMaster = async (entity: string, params: any = {}) => {
  const qs = buildQuery(params);
  const url = `${MASTER_READ}?entity=${entity}${qs ? `&${qs}` : ''}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== 'success') throw new Error(json.message || 'fetch master failed');
  return json.data as any[];
};
const toOptions = (rows: any[], idKey: string, nameKey = 'name_th'): Option[] =>
  rows.map((r) => ({ id: r[idKey], label: r[nameKey] || '' }));

// --- UI helpers (theme like screenshot) ---
const ThemedDivider = () => (
  <View style={{ height: 1, backgroundColor: '#c7d7ff', marginVertical: 12, marginHorizontal: 10, borderRadius: 1 }} />
);
const Section = ({ children }: { children: React.ReactNode }) => (
  <View style={{ backgroundColor: '#f1f5ff', padding: 12, borderRadius: 14, marginBottom: 12 }}>
    {children}
  </View>
);
const Label = ({ children }: { children: React.ReactNode }) => (
  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1f2a56', marginBottom: 6 }}>{children}</Text>
);
const Input = (props: React.ComponentProps<typeof TextInput>) => (
  <TextInput {...props} style={[styles.input, props.style]} placeholderTextColor="#9aa3c7" />
);
const ThemedPicker = ({ selectedValue, onValueChange, options, placeholder }: { selectedValue: any; onValueChange: (v: any) => void; options: Option[]; placeholder: string }) => (
  <View style={styles.pickerWrap}>
    <Picker selectedValue={selectedValue} onValueChange={onValueChange}>
      <Picker.Item label={placeholder} value="" />
      {options.map(opt => <Picker.Item key={opt.id} label={opt.label} value={opt.label} />)}
    </Picker>
  </View>
);

// --- Dropdown with multi-select & max ---
const MultiSelectDropdown = ({
  options, selected, onChange, placeholder, max = 3
}: { options: Option[]; selected: string[]; onChange: (next: string[]) => void; placeholder: string; max?: number }) => {
  const [open, setOpen] = useState(false);
  const toggle = (label: string) => {
    const exists = selected.includes(label);
    let next = [...selected];
    if (exists) next = next.filter(l => l !== label);
    else {
      if (selected.length >= max) { Alert.alert(`เลือกได้สูงสุด ${max} รายการ`); return; }
      next.push(label);
    }
    onChange(next);
  };
  return (
    <View style={{ borderWidth: 1, borderColor: '#cbd5ff', borderRadius: 12, backgroundColor: '#fff' }}>
      <TouchableOpacity onPress={() => setOpen(!open)} style={{ padding: 12 }}>
        <Text style={{ color: selected.length ? '#1f2a56' : '#9aa3c7' }}>
          {selected.length ? selected.join(', ') : placeholder}
        </Text>
      </TouchableOpacity>
      {open && (
        <View style={{ borderTopWidth: 1, borderTopColor: '#e5e7ff', paddingVertical: 6 }}>
          {options.map(opt => (
            <TouchableOpacity key={opt.id} style={styles.checkRow} onPress={() => toggle(opt.label)}>
              <View style={[styles.checkbox, selected.includes(opt.label) && styles.checkboxActive]} />
              <Text style={{ marginLeft: 8 }}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const COLORS_DOG = ['ขาว', 'ดำ', 'น้ำตาล', 'ทอง', 'เทา', 'ดำ-น้ำตาล', 'ขาว-ดำ', 'ครีม', 'ผสม'];
const COLORS_CAT = ['ขาว', 'ดำ', 'ส้ม', 'เทา', 'ลายเสือ', 'ขาว-ดำ', 'ดำ-ส้ม', 'ครีม', 'ผสม'];

// --- Re-match endpoints / route
const MATCH_POSTS = (API as any).MATCH_POSTS || `${(API as any).BASE_URL || ''}/post/match_posts.php`;
const MATCH_RESULT_ROUTE = (API as any).ROUTE_MATCH_RESULT || 'MatchResult';

const Edit_Pet = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { post } = route.params as any;

  const minM = post.min_age ? parseThaiAge(post.min_age) : null;
  const maxM = post.max_age ? parseThaiAge(post.max_age) : null;

  const [formData, setFormData] = useState({
    title: post.title || '',
    type: post.type || 'หมา',
    breed: post.breed || '',
    gender: post.sex || 'ผู้',
    age_mode: (minM === null && maxM === null) ? 'any' : (minM === maxM ? 'exact' : 'range'),
    exactYear: (minM !== null && maxM === minM) ? monthsToY(minM) : 0,
    exactMonth: (minM !== null && maxM === minM) ? monthsToM(minM) : 0,
    startYear: (minM !== null) ? monthsToY(minM) : 0,
    startMonth: (minM !== null) ? monthsToM(minM) : 0,
    endYear: (maxM !== null) ? monthsToY(maxM) : 0,
    endMonth: (maxM !== null) ? monthsToM(maxM) : 0,
    color: post.color ? String(post.color).split(',').map((s: string) => s.trim()) : [] as string[],
    steriliz: post.steriliz || '',
    vaccinated: post.vaccine === 'ยังไม่ได้ฉีด' ? 'ยังไม่ได้ฉีด' : 'ฉีดวัคซีนแล้ว',
    environmentSel: post.environment ? String(post.environment).split(',').map((s: string) => s.trim()) : [] as string[]
  });
  const [vaccineList, setVaccineList] = useState<string[]>(
    post.vaccine && post.vaccine !== 'ยังไม่ได้ฉีด' ? String(post.vaccine).split(',').map((s: string) => s.trim()) : []
  );

  const [breedOptions, setBreedOptions] = useState<Option[]>([]);
  const [vaccineOptions, setVaccineOptions] = useState<Option[]>([]);
  const [housingOptions, setHousingOptions] = useState<Option[]>([]);

  useEffect(() => {
    const sp = speciesCode(formData.type);
    (async () => {
      try {
        const [breeds, vaccines, housings] = await Promise.all([
          fetchMaster('breeds', { species: sp, active: 1, per_page: 300 }),
          fetchMaster('vaccines', { species: sp, active: 1, per_page: 300 }),
          fetchMaster('housing_types', { active: 1, per_page: 300 }),
        ]);
        setBreedOptions(toOptions(breeds, 'breed_id'));
        setVaccineOptions(toOptions(vaccines, 'vaccine_id'));
        setHousingOptions(toOptions(housings, 'housing_id'));
      } catch (e) { console.warn(e); }
    })();
  }, [formData.type]);

  const toggleColor = (c: string) => {
    setFormData(prev => {
      const arr = [...(prev.color as string[])];
      const i = arr.indexOf(c);
      if (i >= 0) arr.splice(i, 1);
      else {
        if (arr.length >= 3) { Alert.alert('เลือกได้สูงสุด 3 สี'); return prev; }
        arr.push(c);
      }
      return { ...prev, color: arr };
    });
  };

  // ✅ Re-match (เขียนทับประวัติเดิม)
  const rematchAfterUpdateFP = async (id: number) => {
    try {
      const url = `${MATCH_POSTS}?mode=from_fp&id=${id}&save=1&overwrite=1`;
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      const j = await r.json();

      if (j?.status === 'success') {
        try {
          navigation.navigate(MATCH_RESULT_ROUTE, {
            mode: 'from_fp',
            sourceId: id,
            items: j.data,
            raw: j
          });
        } catch {
          Alert.alert('อัปเดตสำเร็จ', `จับคู่ใหม่แล้ว ${j?.data?.length || 0} รายการ`);
        }
      } else {
        Alert.alert('อัปเดตสำเร็จ', `บันทึกโพสต์แล้ว แต่จับคู่ใหม่ไม่สำเร็จ: ${j?.message || 'ไม่ทราบสาเหตุ'}`);
      }
    } catch (e: any) {
      Alert.alert('อัปเดตสำเร็จ', `บันทึกโพสต์แล้ว แต่เรียกจับคู่ใหม่ไม่ได้: ${e?.message || e}`);
    }
  };

  const handleSubmit = async () => {
    const username = await AsyncStorage.getItem('username') || 'guest';
    // คำนวณช่วงอายุใหม่
    let __minMonths: number | null = null, __maxMonths: number | null = null;
    if (formData.age_mode === 'exact') {
      const m = yMtoMonths(formData.exactYear, formData.exactMonth);
      __minMonths = m; __maxMonths = m;
    } else if (formData.age_mode === 'range') {
      __minMonths = yMtoMonths(formData.startYear, formData.startMonth);
      __maxMonths = yMtoMonths(formData.endYear, formData.endMonth);
      if ((__minMonths as number) > (__maxMonths as number)) {
        Alert.alert('ตรวจสอบช่วงอายุ', 'อายุเริ่มต้นมากกว่าสิ้นสุด');
        return;
      }
    }
    const __MINAGE_STR = (__minMonths === null) ? '' : monthsToString(__minMonths);
    const __MAXAGE_STR = (__maxMonths === null) ? '' : monthsToString(__maxMonths);

    const payload = {
      id: post.id,
      user: username,
      postType: 'fp',
      title: formData.title,
      type: formData.type,
      breed: formData.breed,
      sex: formData.gender,
      min_age: __MINAGE_STR,
      max_age: __MAXAGE_STR,
      color: (formData.color as string[]).join(', '),
      steriliz: formData.steriliz,
      vaccine: formData.vaccinated === 'ฉีดวัคซีนแล้ว' ? vaccineList.join(', ') : 'ยังไม่ได้ฉีด',
      environment: (formData.environmentSel as string[]).join(', ')
    };
    try {
      const res = await fetch(`${(API as any).POST_UPDATE_PET}?id=${post.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const text = await res.text();
      let json: any = null; try { json = JSON.parse(text); } catch { }
      if (json?.status === 'success') {
        // 🔁 รี-แมตช์และเขียนทับประวัติเดิม
        await rematchAfterUpdateFP(post.id);
        // navigation.goBack();
      }
      else Alert.alert('ผิดพลาด', (json && json.message) || text || 'บันทึกไม่ได้');
    } catch (e: any) { Alert.alert('ผิดพลาด', e.message || 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>แก้ไขโพสต์ (หาสัตว์เลี้ยง)</Text>

        <Section>
          <Label>ชื่อโพสต์</Label>
          <Input value={formData.title} onChangeText={(t: string) => setFormData(p => ({ ...p, title: t }))} />
          <ThemedDivider />

          <Label>ชนิดของสัตว์</Label>
          <View style={styles.row}>
            {['หมา', 'แมว'].map(opt => (
              <TouchableOpacity key={opt} style={[styles.pill, formData.type === opt && styles.pillActive]} onPress={() => setFormData(p => ({ ...p, type: opt }))}>
                <Text style={[styles.pillText, formData.type === opt && styles.pillTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <ThemedDivider />

          <Label>สายพันธุ์</Label>
          <ThemedPicker selectedValue={formData.breed} onValueChange={(v: any) => setFormData(p => ({ ...p, breed: String(v) }))} options={breedOptions} placeholder="-- เลือกสายพันธุ์ --" />
          <ThemedDivider />

          <Label>เพศ</Label>
          <View style={styles.row}>
            {['ผู้', 'เมีย'].map(opt => (
              <TouchableOpacity key={opt} style={[styles.pill, formData.gender === opt && styles.pillActive]} onPress={() => setFormData(p => ({ ...p, gender: opt }))}>
                <Text style={[styles.pillText, formData.gender === opt && styles.pillTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <ThemedDivider />

          <Label>อายุที่ต้องการ</Label>
          <AgeSelector
            mode={formData.age_mode as any}
            setMode={(m) => setFormData(p => ({ ...p, age_mode: m }))}
            exactYear={formData.exactYear}
            exactMonth={formData.exactMonth}
            setExactYear={(n) => setFormData(p => ({ ...p, exactYear: n }))}
            setExactMonth={(n) => setFormData(p => ({ ...p, exactMonth: n }))}
            startYear={formData.startYear}
            startMonth={formData.startMonth}
            endYear={formData.endYear}
            endMonth={formData.endMonth}
            setStartYear={(n) => setFormData(p => ({ ...p, startYear: n }))}
            setStartMonth={(n) => setFormData(p => ({ ...p, startMonth: n }))}
            setEndYear={(n) => setFormData(p => ({ ...p, endYear: n }))}
            setEndMonth={(n) => setFormData(p => ({ ...p, endMonth: n }))}
          />

          <ThemedDivider />


          <Label>สีที่สนใจ (สูงสุด 3)</Label>
          <View style={styles.row}>
            {(formData.type === 'หมา' ? COLORS_DOG : COLORS_CAT).map(c => (
              <TouchableOpacity key={c} style={[styles.pill, (formData.color as string[]).includes(c) && styles.pillActive]} onPress={() => toggleColor(c)}>
                <Text style={[styles.pillText, (formData.color as string[]).includes(c) && styles.pillTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <ThemedDivider />

          <Label>สถานะทำหมัน</Label>
          <View style={styles.row}>
            {['ทำหมันแล้ว', 'ยังไม่ได้ทำหมัน', 'ไม่ระบุ'].map(opt => (
              <TouchableOpacity key={opt} style={[styles.pill, formData.steriliz === opt && styles.pillActive]} onPress={() => setFormData(p => ({ ...p, steriliz: opt }))}>
                <Text style={[styles.pillText, formData.steriliz === opt && styles.pillTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <ThemedDivider />

          <Label>สถานะวัคซีน</Label>
          <View style={styles.row}>
            {['ฉีดวัคซีนแล้ว', 'ยังไม่ได้ฉีด'].map(opt => (
              <TouchableOpacity key={opt} style={[styles.pill, formData.vaccinated === opt && styles.pillActive]} onPress={() => setFormData(p => ({ ...p, vaccinated: opt }))}>
                <Text style={[styles.pillText, formData.vaccinated === opt && styles.pillTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {formData.vaccinated === 'ฉีดวัคซีนแล้ว' && (
            <View style={{ marginTop: 8 }}>
              {vaccineOptions.map(opt => (
                <TouchableOpacity key={opt.id} style={styles.checkRow} onPress={() => {
                  setVaccineList(prev => prev.includes(opt.label) ? prev.filter(v => v !== opt.label) : [...prev, opt.label]);
                }}>
                  <View style={[styles.checkbox, vaccineList.includes(opt.label) && styles.checkboxActive]} />
                  <Text style={{ marginLeft: 8 }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <ThemedDivider />

          <Label>ประเภทที่อยู่อาศัย (เลือกได้สูงสุด 3)</Label>
          <MultiSelectDropdown options={housingOptions} selected={formData.environmentSel} onChange={(arr) => setFormData(p => ({ ...p, environmentSel: arr }))} placeholder="-- เลือกประเภทที่อยู่อาศัย --" max={3} />
        </Section>

        <TouchableOpacity style={styles.btnPrimary} onPress={handleSubmit}>
          <Text style={styles.btnPrimaryText}>บันทึกการแก้ไขและรี-แมตช์</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Edit_Pet;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '800', color: '#1f2a56', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#cbd5ff', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#1f2a56' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5ff', marginRight: 8, marginBottom: 8 },
  pillActive: { backgroundColor: '#1f2a56' },
  pillText: { color: '#1f2a56', fontWeight: '700' },
  pillTextActive: { color: '#fff', fontWeight: '800' },

  pickerWrap: { borderWidth: 1, borderColor: '#cbd5ff', borderRadius: 12, backgroundColor: '#fff' },

  btnPrimary: { backgroundColor: '#1f2a56', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#9aa3c7', backgroundColor: '#fff' },
  checkboxActive: { backgroundColor: '#1f2a56', borderColor: '#1f2a56' },
});
