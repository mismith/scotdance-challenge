<template>
  <v-dialog v-model="isOpen" max-width="320">
    <v-card class="EditChallenge">
      <v-form autocomplete="off" @submit.prevent="handleSubmit()">
        <v-card-title>
          <div class="flex">
            {{ isNew ? 'Add' : 'Edit' }} {{ $root.getLabel('Challenge') }}
          </div>
          <v-btn icon class="mr-n1" @click="isOpen = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text v-if="challenge">
          <v-text-field
            v-model="challenge.name"
            label="Name *"
            outlined
            rounded
            required
          />
          <v-textarea
            v-if="showField('description')"
            v-model="challenge.description"
            label="Description"
            outlined
            rounded
            auto-grow
          />
          <v-menu
            v-if="showField('startAt')"
            v-model="isPickingStartAt"
            :close-on-content-click="false"
            offset-y
            nudge-top="24"
            min-width="290"
          >
            <template #activator="{ on }">
              <v-text-field
                v-model="challenge.startAt"
                label="Start Date"
                outlined
                rounded
                clearable
                readonly
                append-icon="mdi-calendar"
                @click:append="isPickingStartAt = true"
                v-on="on"
              />
            </template>
            <v-date-picker
              v-model="challenge.startAt"
              no-title
              @input="isPickingStartAt = false"
            />
          </v-menu>
          <v-menu
            v-if="showField('endAt')"
            v-model="isPickingEndAt"
            :close-on-content-click="false"
            offset-y
            nudge-top="24"
            min-width="290"
          >
            <template #activator="{ on }">
              <v-text-field
                v-model="challenge.endAt"
                label="End Date"
                outlined
                rounded
                clearable
                readonly
                append-icon="mdi-calendar"
                @click:append="isPickingEndAt = true"
                v-on="on"
              />
            </template>
            <v-date-picker
              v-model="challenge.endAt"
              no-title
              @input="isPickingEndAt = false"
            />
          </v-menu>
          <div v-if="showField('labels')" class="mb-10">
            <v-subheader class="mb-1 pl-6" style="height: auto;">Label Overrides</v-subheader>
            <v-text-field
              :value="challenge.labels && challenge.labels.Group || null"
              label="Group"
              outlined
              rounded
              clearable
              dense
              hide-details
              class="mb-2"
              @input="v => $set(challenge, 'labels.Group', v)"
            />
            <v-text-field
              :value="challenge.labels && challenge.labels.Participant || null"
              label="Participant"
              outlined
              rounded
              clearable
              dense
              hide-details
              class="mb-2"
              @input="v => $set(challenge, 'labels.Participant', v)"
            />
            <v-text-field
              :value="challenge.labels && challenge.labels.Amount || null"
              label="Amount"
              outlined
              rounded
              clearable
              dense
              hide-details
              class="mb-2"
              @input="v => $set(challenge, 'labels.Amount', v)"
            />
          </div>
          <v-switch
            v-model="challenge.private"
            :disabled="!isNew"
            inset
            class="v-input--reverse mt-0 pa-0"
          >
            <template #label>
              <div class="ml-1 mr-2">
                Private
              </div>
              <v-tooltip top max-width="296">
                <template #activator="{ on }">
                  <v-icon small @click.stop v-on="on">mdi-help-circle-outline</v-icon>
                </template>
                <div>
                  Private challenges must be 'unlocked' by each participant via an Access Link,
                  so they are ideal when entries are limited to specific participants.
                </div>
              </v-tooltip>
              <v-icon class="ml-auto">mdi-shield-lock</v-icon>
            </template>
          </v-switch>

          <div class="d-flex flex-wrap">
            <v-chip
              v-if="!showField('startAt')"
              small
              class="mr-1 mb-1"
              @click="showField('startAt', true)"
            >
              <v-icon left small>mdi-plus</v-icon>
              Start Date
            </v-chip>
            <v-chip
              v-if="!showField('endAt')"
              small
              class="mr-1 mb-1"
              @click="showField('endAt', true)"
            >
              <v-icon left small>mdi-plus</v-icon>
              End Date
            </v-chip>
            <v-chip
              v-if="!showField('description')"
              small
              class="mr-1 mb-1"
              @click="showField('description', true)"
            >
              <v-icon left small>mdi-plus</v-icon>
              Description
            </v-chip>
            <v-chip
              v-if="!showField('labels')"
              small
              class="mr-1 mb-1"
              @click="showField('labels', true)"
            >
              <v-icon left small>mdi-cursor-text</v-icon>
              Labels
            </v-chip>
          </div>

          <div v-if="challenge.createdAt" class="my-4">
            <div class="overline">Created</div>
            {{ challenge.createdAt.toDate().toLocaleString() }}
          </div>
          <div v-if="challenge.updatedAt" class="my-4">
            <div class="overline">Updated</div>
            {{ challenge.updatedAt.toDate().toLocaleString() }}
          </div>
        </v-card-text>
        <v-card-actions class="justify-center pt-0 pa-4">
          <v-btn
            type="submit"
            rounded
            block
            x-large
            color="primary"
            :disabled="!isValid"
          >
            {{ isNew ? 'Add' : 'Save' }}
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script>
import Vue from 'vue'
import get from 'lodash.get'
import { idKey } from '@/plugins/firebase'

function isEmpty(obj) {
  if (typeof obj === 'object') return Boolean(Object.values(obj || {}).filter(Boolean).length)
  return Boolean(obj)
}

export default Vue.extend({
  name: 'EditChallenge',
  props: {
    value: {
      type: Object,
      default: null,
    },
  },
  data() {
    return {
      idKey,
      challenge: {},
      isPickingStartAt: false,
      isPickingEndAt: false,
      showFields: {},
    }
  },
  computed: {
    isOpen: {
      get() {
        return Boolean(this.value)
      },
      set(isOpen) {
        if (!isOpen) {
          this.$emit('input', null)
        }
      },
    },
    isNew() {
      return this.value && !this.value[idKey]
    },
    isValid() {
      if (this.challenge) {
        if (!this.challenge.name || !this.challenge.name.trim()) return false
      }
      return true
    },
  },
  watch: {
    value: {
      handler(value) {
        this.challenge = { ...value }
      },
      immediate: true,
    },
    isOpen(isOpen) {
      if (!isOpen) {
        // reset on close
        this.challenge = {}
        this.isPickingStartAt = false
        this.isPickingEndAt = false
        this.showFields = {}
      }
    },
  },
  methods: {
    showField(field, set = undefined) {
      if (set !== undefined) {
        this.$set(this.showFields, field, set)
      }
      return get(this.showFields, field, isEmpty(this.value && this.value[field]))
    },

    handleSubmit() {
      if (this.isNew) {
        this.$emit('add', this.challenge)
      } else {
        this.$emit('save', this.challenge)
      }
    },
  },
})
</script>
