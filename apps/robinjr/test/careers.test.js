// Automated checks for careers test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');

const { listAdminCareerState } = require('../netlify/functions/careers-list');

function supabaseCareerState({ templates, assignments }) {
  return {
    from(table) {
      if (table === 'career_templates') {
        return {
          select() {
            return {
              order: async () => ({ data: templates, error: null }),
            };
          },
        };
      }
      assert.equal(table, 'client_careers');
      return {
        select(columns) {
          assert.equal(columns, 'career_template_id');
          return {
            eq: async (column, value) => {
              assert.equal(column, 'user_id');
              assert.equal(value, '11111111-1111-4111-8111-111111111111');
              return { data: assignments, error: null };
            },
          };
        },
      };
    },
  };
}

test('el listado admin devuelve las carreras asignadas al alumno seleccionado', async () => {
  const state = await listAdminCareerState(
    supabaseCareerState({
      templates: [{ id: 'career-1' }, { id: 'career-2' }],
      assignments: [{ career_template_id: 'career-2' }],
    }),
    '11111111-1111-4111-8111-111111111111'
  );

  assert.deepEqual(state, {
    templates: [{ id: 'career-1' }, { id: 'career-2' }],
    assigned_template_ids: ['career-2'],
  });
});

test('el listado de biblioteca sin alumno conserva una lista de asignaciones vacía', async () => {
  const state = await listAdminCareerState(
    supabaseCareerState({ templates: [{ id: 'career-1' }], assignments: [] })
  );

  assert.deepEqual(state, {
    templates: [{ id: 'career-1' }],
    assigned_template_ids: [],
  });
});
